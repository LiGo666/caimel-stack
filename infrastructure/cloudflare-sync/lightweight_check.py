#!/usr/bin/env python3
import subprocess
import os
import logging
import time
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
logger = logging.getLogger('cloudflare-lightweight-check')

# Environment variables
DOMAIN_BASE = os.environ.get('DOMAIN_BASE', '')

# Health check file
HEALTH_CHECK_FILE = '/tmp/cloudflare_sync_health'

# Traefik config file and tracking for changes
TRAEFIK_CONFIG = '/etc/traefik/config.yml'
TRAEFIK_CHECKSUM_FILE = '/tmp/traefik_config_checksum'

def check_ssh_connectivity():
    """Check if SSH is reachable on the designated hostname"""
    if not DOMAIN_BASE:
        logger.error("DOMAIN_BASE environment variable not set")
        return False
        
    hostname = f"ssh-3afb6505.{DOMAIN_BASE}"
    try:
        # Attempt to connect to port 22 with a timeout of 5 seconds
        result = subprocess.run(['nc', '-vz', '-w', '5', hostname, '22'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            logger.debug(f"SSH connectivity check successful for {hostname}")
            return True
        else:
            logger.warning(f"SSH connectivity check failed for {hostname}: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error during SSH connectivity check: {str(e)}")
        return False

def get_traefik_checksum():
    """Calculate checksum of Traefik config to detect changes"""
    try:
        result = subprocess.run(['md5sum', TRAEFIK_CONFIG], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.split()[0]
    except Exception as e:
        logger.error(f"Error calculating Traefik config checksum: {str(e)}")
    return None

def has_traefik_config_changed():
    """Check if Traefik config has changed since last full sync"""
    current_checksum = get_traefik_checksum()
    if not current_checksum:
        return True  # Err on side of caution, assume changed if can't read
        
    if not os.path.exists(TRAEFIK_CHECKSUM_FILE):
        return True  # No previous checksum, consider as changed
        
    with open(TRAEFIK_CHECKSUM_FILE, 'r') as f:
        previous_checksum = f.read().strip()
        
    return current_checksum != previous_checksum

def update_traefik_checksum():
    """Update the stored checksum of Traefik config after full sync"""
    checksum = get_traefik_checksum()
    if checksum:
        with open(TRAEFIK_CHECKSUM_FILE, 'w') as f:
            f.write(checksum)

def update_health_check():
    """Update health check file with current timestamp"""
    with open(HEALTH_CHECK_FILE, 'w') as f:
        f.write(datetime.now().isoformat())

def run_full_sync():
    """Run the full Cloudflare sync script"""
    try:
        result = subprocess.run(['python', '/app/sync_cloudflare.py'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("Full Cloudflare sync completed successfully")
            update_traefik_checksum()
            return True
        else:
            logger.error(f"Full Cloudflare sync failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error running full sync: {str(e)}")
        return False

def main():
    logger.info("Starting lightweight check execution")
    # Check for Traefik config changes first
    if has_traefik_config_changed():
        logger.info("Traefik configuration change detected, running full sync")
        if run_full_sync():
            update_health_check()
            return 0
        else:
            return 1
    
    # Lightweight check if no config change
    if check_ssh_connectivity():
        logger.info("Lightweight check passed, skipping full sync")
        update_health_check()
        return 0
        
    # If lightweight check fails, run full sync
    logger.warning("Lightweight check failed, proceeding with full sync")
    if run_full_sync():
        update_health_check()
        return 0
    else:
        return 1

if __name__ == "__main__":
    exit(main())
