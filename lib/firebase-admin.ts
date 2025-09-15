import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get service account from file
const getServiceAccount = () => {
  try {
    const serviceAccountPath = join(process.cwd(), 'upcompaniontest-firebase-adminsdk-vfftg-d6ab1dfa67.json');
    const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
    return JSON.parse(serviceAccountData);
  } catch (error) {
    console.error('❌ Error loading service account:', error);
    throw error;
  }
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: 'upcompaniontest',
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export { admin };
export const remoteConfig = admin.remoteConfig();

// Cache for remote config values
const configCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get Remote Config value with caching
 * @param parameter The parameter key to retrieve
 * @param useCache Whether to use caching (default: true)
 * @returns The parameter value or null if not found
 */
export async function getRemoteConfigValue(parameter: string, useCache: boolean = true): Promise<any> {
  try {
    // Check cache first
    if (useCache) {
      const cached = configCache.get(parameter);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`📦 Using cached Remote Config value for: ${parameter}`);
        return cached.value;
      }
    }

    console.log(`🔄 Fetching Remote Config value for: ${parameter}`);
    
    // Get the template from Firebase
    const template = await remoteConfig.getTemplate();
    const parameterConfig = template.parameters[parameter];
    
    if (!parameterConfig) {
      console.warn(`⚠️ Remote Config parameter '${parameter}' not found`);
      return null;
    }

    // Get the default value
    const defaultValue = parameterConfig.defaultValue;
    let value = null;
    
    if (defaultValue?.value) {
      // Try to parse JSON if it looks like JSON
      try {
        value = JSON.parse(defaultValue.value);
      } catch {
        // If not JSON, use as string
        value = defaultValue.value;
      }
    }

    // Cache the value
    if (useCache) {
      configCache.set(parameter, {
        value,
        timestamp: Date.now()
      });
    }

    console.log(`✅ Retrieved Remote Config value for '${parameter}'`);
    return value;
    
  } catch (error) {
    console.error(`❌ Error retrieving Remote Config parameter '${parameter}':`, error);
    return null;
  }
}

/**
 * Set Remote Config value
 * @param parameter The parameter key to set
 * @param value The value to set
 * @param description Optional description for the parameter
 */
export async function setRemoteConfigValue(
  parameter: string, 
  value: any, 
  description?: string
): Promise<boolean> {
  try {
    console.log(`📝 Setting Remote Config value for: ${parameter}`);
    
    const template = await remoteConfig.getTemplate();
    
    // Convert value to string if it's an object
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    template.parameters[parameter] = {
      defaultValue: {
        value: stringValue
      },
      description: description || `Parameter ${parameter} set by API`,
      valueType: 'STRING' as const
    };

    // Update the template
    const updatedTemplate = await remoteConfig.publishTemplate(template);
    
    // Clear cache for this parameter
    configCache.delete(parameter);
    
    console.log(`✅ Remote Config parameter '${parameter}' updated. Version: ${updatedTemplate.version}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error setting Remote Config parameter '${parameter}':`, error);
    return false;
  }
}

/**
 * Clear cache for all or specific parameter
 * @param parameter Optional specific parameter to clear, if not provided clears all
 */
export function clearConfigCache(parameter?: string): void {
  if (parameter) {
    configCache.delete(parameter);
    console.log(`🧹 Cleared cache for parameter: ${parameter}`);
  } else {
    configCache.clear();
    console.log(`🧹 Cleared all Remote Config cache`);
  }
}