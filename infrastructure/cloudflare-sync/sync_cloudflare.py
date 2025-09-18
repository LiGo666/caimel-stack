#!/usr/bin/env python3
import yaml
import re
import json
import sys
import os
import subprocess
import requests
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/cloudflare-sync.log')
    ]
)
logger = logging.getLogger('cloudflare-sync')

# Environment variables
CLOUDFLARE_API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN')
DOMAIN_BASE = os.environ.get('DOMAIN_BASE', '')

# Health check file
HEALTH_CHECK_FILE = '/tmp/cloudflare_sync_health'

def extract_hostnames(config_file):
    """Extract hostnames from Traefik configuration file"""
    with open(config_file, 'r') as file:
        config = yaml.safe_load(file)
    
    hostnames = []
    
    # Extract hostnames from router rules
    if config and 'http' in config and 'routers' in config['http']:
        for router_name, router_config in config['http']['routers'].items():
            if 'rule' in router_config:
                # Extract hostname from Host(`hostname`) pattern
                rule = router_config['rule']
                # Using regex to find hostnames inside Host(`...`)
                matches = re.findall(r'Host\(`([^`]+)`\)', rule)
                if matches:
                    for hostname in matches:
                        hostnames.append(hostname)
    
    return hostnames

def get_external_ip():
    """Get current external IP address using multiple services for redundancy"""
    services = [
        'https://api.ipify.org',
        'https://ifconfig.me',
        'https://ipinfo.io/ip'
    ]
    
    for service in services:
        try:
            response = requests.get(service, timeout=5)
            if response.status_code == 200:
                ip = response.text.strip()
                # Validate IP format
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', ip):
                    return ip
        except Exception as e:
            logger.warning(f"Failed to get IP from {service}: {str(e)}")
    
    raise Exception("Failed to get external IP address from any service")

def get_zone_id(domain):
    """Get Cloudflare Zone ID for the domain"""
    if not CLOUDFLARE_API_TOKEN:
        raise Exception("CLOUDFLARE_API_TOKEN environment variable is not set")
    
    url = f"https://api.cloudflare.com/client/v4/zones?name={domain}"
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    if not data['success']:
        error_msg = data.get('errors', [{'message': 'Unknown error'}])[0].get('message')
        raise Exception(f"Failed to get zone ID: {error_msg}")
    
    if len(data['result']) == 0:
        raise Exception(f"No zone found for domain: {domain}")
    
    return data['result'][0]['id']

def get_existing_records(zone_id):
    """Get all existing DNS records from Cloudflare"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    if not data['success']:
        error_msg = data.get('errors', [{'message': 'Unknown error'}])[0].get('message')
        raise Exception(f"Failed to get existing DNS records: {error_msg}")
    
    return data['result']

def update_dns_record(zone_id, record_id, hostname, ip, proxied=True):
    """Update an existing DNS record"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}"
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    data = {
        "type": "A",
        "name": hostname,
        "content": ip,
        "ttl": 1,
        "proxied": proxied
    }
    
    response = requests.put(url, headers=headers, json=data)
    return response.json()

def create_dns_record(zone_id, hostname, ip, proxied=True):
    """Create a new DNS record"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    data = {
        "type": "A",
        "name": hostname,
        "content": ip,
        "ttl": 1,
        "proxied": proxied
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def delete_dns_record(zone_id, record_id):
    """Delete a DNS record"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}"
    headers = {
        'Authorization': f'Bearer {CLOUDFLARE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.delete(url, headers=headers)
    return response.json()

def sync_dns_records(hostnames):
    """Sync DNS records with Cloudflare based on hostnames from Traefik config"""
    if not DOMAIN_BASE:
        raise Exception("DOMAIN_BASE environment variable is not set")
    
    success = True
    
    try:
        # Get current external IP
        external_ip = get_external_ip()
        logger.debug(f"Current external IP: {external_ip}")
        
        # Get zone ID for the domain
        zone_id = get_zone_id(DOMAIN_BASE)
        logger.debug(f"Using zone ID: {zone_id} for domain: {DOMAIN_BASE}")
        
        # Get existing DNS records
        existing_records = get_existing_records(zone_id)
        
        # Process root domain A record
        root_record = None
        for record in existing_records:
            if record['type'] == 'A' and record['name'] == DOMAIN_BASE:
                root_record = record
                break
        
        if root_record:
            if root_record['content'] != external_ip:
                logger.info(f"Updated IP address for {DOMAIN_BASE} to {external_ip}")
                result = update_dns_record(zone_id, root_record['id'], DOMAIN_BASE, external_ip)
                if not result['success']:
                    logger.error(f"Failed to update root domain: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                    success = False
        else:
            logger.info(f"Added A-record {DOMAIN_BASE} with IP: {external_ip}")
            result = create_dns_record(zone_id, DOMAIN_BASE, external_ip)
            if not result['success']:
                logger.error(f"Failed to create root domain record: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                success = False
        
        # Prepare processed records and handle static records
        processed_records = [DOMAIN_BASE]  # Start with root domain

        # Always ensure an unproxied A record for SSH helper hostname
        ssh_hostname = f"ssh-3afb6505.{DOMAIN_BASE}".lower()
        ssh_record = None
        for record in existing_records:
            if record['type'] == 'A' and record['name'] == ssh_hostname:
                ssh_record = record
                break

        # Mark as processed to avoid cleanup
        processed_records.append(ssh_hostname)

        if ssh_record:
            if ssh_record['content'] != external_ip or ssh_record.get('proxied', True) != False:
                logger.info(f"Ensuring unproxied A-record {ssh_hostname} with IP: {external_ip}")
                result = update_dns_record(zone_id, ssh_record['id'], ssh_hostname, external_ip, proxied=False)
                if not result['success']:
                    logger.error(f"Failed to update record for {ssh_hostname}: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                    success = False
        else:
            logger.info(f"Added unproxied A-record {ssh_hostname} with IP: {external_ip}")
            result = create_dns_record(zone_id, ssh_hostname, external_ip, proxied=False)
            if not result['success']:
                logger.error(f"Failed to create record for {ssh_hostname}: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                success = False

        # Process subdomain records
        
        for hostname in hostnames:
            hostname_lower = hostname.lower()

            # Skip the SSH helper hostname here, it is managed explicitly above
            if hostname_lower == ssh_hostname:
                continue
            record_exists = False
            
            # Determine if this hostname should be proxied or not
            # Hostnames ending with -d should not be proxied
            should_proxy = not hostname_lower.endswith("-d." + DOMAIN_BASE)
            if not should_proxy:
                logger.info(f"Hostname {hostname_lower} ends with -d, setting DNS-only mode (no proxy)")
            
            # Check if record already exists
            for record in existing_records:
                if record['type'] == 'A' and record['name'] == hostname_lower:
                    processed_records.append(hostname_lower)
                    record_exists = True
                    
                    # Update record if IP changed or proxy setting is different
                    if record['content'] != external_ip or record.get('proxied', True) != should_proxy:
                        logger.info(f"Updated {hostname_lower} to IP: {external_ip}, proxied: {should_proxy}")
                        result = update_dns_record(zone_id, record['id'], hostname_lower, external_ip, proxied=should_proxy)
                        if not result['success']:
                            logger.error(f"Failed to update record for {hostname_lower}: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                            success = False
                    
                    break
            
            # Create record if it doesn't exist
            if not record_exists:
                logger.info(f"Added A-record {hostname_lower} with IP: {external_ip}, proxied: {should_proxy}")
                result = create_dns_record(zone_id, hostname_lower, external_ip, proxied=should_proxy)
                processed_records.append(hostname_lower)
                if not result['success']:
                    logger.error(f"Failed to create record for {hostname_lower}: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                    success = False
        
        # Remove orphaned records only when we actually have Traefik hostnames
        if hostnames:
            for record in existing_records:
                if record['type'] == 'A' and record['name'].endswith(f".{DOMAIN_BASE}") and record['name'] not in processed_records:
                    logger.info(f"Removed A-record {record['name']}")
                    result = delete_dns_record(zone_id, record['id'])
                    if not result['success']:
                        logger.error(f"Failed to delete record for {record['name']}: {result.get('errors', [{'message': 'Unknown error'}])[0].get('message')}")
                        success = False
                    
        return success
    
    except Exception as e:
        logger.error(f"Sync error: {str(e)}")
        return False

def main():
    config_path = '/etc/traefik/config.yml'
    
    if not os.path.exists(config_path):
        logger.error(f"Error: Configuration file {config_path} not found")
        sys.exit(1)
    
    # Check if required environment variables are set - exit early if not
    if not CLOUDFLARE_API_TOKEN:
        sys.exit(0)  # Exit silently
    
    if not DOMAIN_BASE:
        sys.exit(0)  # Exit silently
    
    try:
        # Extract hostnames from Traefik config
        hostnames = extract_hostnames(config_path)
        
        if hostnames:
            # Only log total count, not individual hostnames
            logger.debug(f"Found {len(hostnames)} hostnames in Traefik configuration")
        else:
            logger.warning("No hostnames found in the Traefik configuration; ensuring static DNS entries only")

        # Always run sync to ensure static entries (e.g., ssh-3afb6505.DOMAIN_BASE)
        success = sync_dns_records(hostnames)

        # Update health check file if sync was successful
        if success:
            with open(HEALTH_CHECK_FILE, 'w') as f:
                f.write(datetime.now().isoformat())
    
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        sys.exit(1)
        
    # Success
    sys.exit(0)

if __name__ == "__main__":
    main()
