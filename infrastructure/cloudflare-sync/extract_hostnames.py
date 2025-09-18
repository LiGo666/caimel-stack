#!/usr/bin/env python3
import yaml
import re
import json
import sys
import os

def extract_hostnames(config_file):
    # Read YAML configuration
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

def main():
    config_path = '/etc/traefik/config.yml'
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file {config_path} not found", file=sys.stderr)
        sys.exit(1)
    
    try:
        hostnames = extract_hostnames(config_path)
        
        if hostnames:
            print("Found hostnames:")
            for hostname in hostnames:
                print(f"- {hostname}")
            
            # Output as JSON for potential programmatic usage
            output = {"hostnames": hostnames}
            print("\nJSON output:")
            print(json.dumps(output, indent=2))
        else:
            print("No hostnames found in the configuration file.")
    
    except Exception as e:
        print(f"Error processing configuration: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
