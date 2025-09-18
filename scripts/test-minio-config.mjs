#!/usr/bin/env node

/**
 * Test script to verify MinIO configuration parsing
 * 
 * This script simulates different environment variable configurations
 * and shows how they would be parsed by the MinIO config module.
 */

// Mock environment variables
function testConfig(envVars) {
  console.log('\n--- Testing Configuration ---');
  console.log('Environment Variables:');
  console.log(envVars);
  
  // Simulate URL parsing
  // Constants for default values
  const DEFAULT_HOST = 'localhost';
  const DEFAULT_PORT = 9000;
  const DEFAULT_HTTPS_PORT = 443;
  const DEFAULT_HTTP_PORT = 80;
  
  try {
    let config;
    
    if (envVars.MINIO_ENDPOINT) {
      try {
        const endpointUrl = new URL(envVars.MINIO_ENDPOINT);
        
        // Determine if using SSL based on protocol
        const useSSL = endpointUrl.protocol === "https:";
        
        // Set default port based on protocol if not specified
        const defaultPort = useSSL ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT;
        
        config = {
          endPoint: endpointUrl.hostname,
          port: endpointUrl.port ? Number.parseInt(endpointUrl.port, 10) : defaultPort,
          useSSL,
          accessKey: envVars.MINIO_ACCESS_KEY,
          secretKey: envVars.MINIO_SECRET_KEY,
        };
        console.log('\nUsing ENDPOINT configuration');
      } catch (_parseError) {
        console.log('\nInvalid ENDPOINT format, falling back to HOST/PORT');
        config = {
          endPoint: envVars.MINIO_HOST || DEFAULT_HOST,
          port: envVars.MINIO_PORT || DEFAULT_PORT,
          useSSL: envVars.MINIO_SSL === 'true',
          accessKey: envVars.MINIO_ACCESS_KEY,
          secretKey: envVars.MINIO_SECRET_KEY,
        };
      }
    } else {
      console.log('\nNo ENDPOINT provided, using HOST/PORT configuration');
      config = {
        endPoint: envVars.MINIO_HOST || DEFAULT_HOST,
        port: envVars.MINIO_PORT || DEFAULT_PORT,
        useSSL: envVars.MINIO_SSL === 'true',
        accessKey: envVars.MINIO_ACCESS_KEY,
        secretKey: envVars.MINIO_SECRET_KEY,
      };
    }
    
    console.log('\nParsed Configuration:');
    console.log({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      // Not showing credentials
    });
    
    console.log('\nMinIO Client would connect to:');
    const protocol = config.useSSL ? 'https' : 'http';
    console.log(`${protocol}://${config.endPoint}:${config.port}`);
    
  } catch (error) {
    console.error('Error parsing configuration:', error);
  }
}

// Test cases
console.log('=== MINIO CONFIGURATION TESTS ===');

// Test Case 1: Using ENDPOINT as URI (HTTPS)
testConfig({
  MINIO_ENDPOINT: 'https://upload.caimel.tools',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});

// Test Case 2: Using ENDPOINT as URI with custom port
testConfig({
  MINIO_ENDPOINT: 'https://upload.caimel.tools:8443',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});

// Test Case 3: Using ENDPOINT as URI (HTTP)
testConfig({
  MINIO_ENDPOINT: 'http://upload.caimel.tools',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});

// Test Case 4: Fallback to HOST/PORT/SSL
testConfig({
  MINIO_HOST: 'minio.local',
  MINIO_PORT: '9000',
  MINIO_SSL: 'false',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});

// Test Case 5: Fallback with SSL enabled
testConfig({
  MINIO_HOST: 'minio.local',
  MINIO_PORT: '9000',
  MINIO_SSL: 'true',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});

// Test Case 6: Invalid ENDPOINT format
testConfig({
  MINIO_ENDPOINT: 'invalid-url',
  MINIO_HOST: 'minio.local',
  MINIO_PORT: '9000',
  MINIO_SSL: 'false',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key'
});
