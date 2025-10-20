import admin from 'firebase-admin';

type RawServiceAccount = {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
};

type LoadedServiceAccount = admin.ServiceAccount & {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const normalizeServiceAccount = (raw: RawServiceAccount): LoadedServiceAccount => {
  const projectId = raw.projectId ?? raw.project_id ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail = raw.clientEmail ?? raw.client_email ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = raw.privateKey ?? raw.private_key ?? process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error('Firebase service account is missing projectId/project_id');
  }
  if (!clientEmail) {
    throw new Error('Firebase service account is missing clientEmail/client_email');
  }
  if (!privateKey) {
    throw new Error('Firebase service account is missing privateKey/private_key');
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

// Get service account from environment variables
const getServiceAccount = (): LoadedServiceAccount => {
  try {
    // Try environment variables first (for production/Vercel)
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawServiceAccount) {
      console.log('🔑 Using Firebase service account from environment variables');
      const normalized =
        rawServiceAccount.trim().startsWith('{')
          ? rawServiceAccount
          : Buffer.from(rawServiceAccount, 'base64').toString('utf8');
      return normalizeServiceAccount(JSON.parse(normalized) as RawServiceAccount);
    }
    
    // Try individual environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('🔑 Constructing Firebase service account from individual environment variables');

      // Clean and format the private key properly
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Check if the private key is base64 encoded (for production)
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        try {
          // Try to decode base64
          privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
          console.log('🔓 Decoded base64 private key for production');
        } catch (error) {
          console.error('❌ Failed to decode base64 private key:', error);
          throw new Error('Invalid private key: not valid base64 or PEM format');
        }
      }

      // Handle different newline formats that might occur in environment variables
      if (privateKey.includes('\\\\n')) {
        // Handle double-escaped newlines
        privateKey = privateKey.replace(/\\\\n/g, '\n');
      } else if (privateKey.includes('\\n')) {
        // Handle escaped newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
      } else if (!privateKey.includes('\n') && privateKey.length > 100) {
        // If it's a single line but long, try to restore newlines by inserting them
        // This handles cases where the environment strips all newlines
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
          // Insert newlines every 64 characters in the middle section
          .replace(/(-----BEGIN PRIVATE KEY-----\n)(.+)(\n-----END PRIVATE KEY-----)/, (match, start, middle, end) => {
            const formattedMiddle = middle.match(/.{1,64}/g)?.join('\n') || middle;
            return start + formattedMiddle + end;
          });
      }

      // Ensure proper formatting
      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Invalid private key format: missing BEGIN header');
      }

      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format: missing END header');
      }

      console.log('🔑 Private key format validated successfully');

      return normalizeServiceAccount({
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      });
    }

    throw new Error('Firebase service account env vars are missing. Set FIREBASE_SERVICE_ACCOUNT_KEY or the individual FIREBASE_* credentials.');
  } catch (error) {
    console.error('❌ Error loading Firebase service account:', error);
    throw error;
  }
};

let remoteConfigInstance: admin.remoteConfig.RemoteConfig | null = null;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    remoteConfigInstance = admin.remoteConfig();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export { admin };
export const remoteConfig = remoteConfigInstance;

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
    if (!remoteConfig) {
      console.warn('⚠️ Firebase Remote Config is unavailable; returning null');
      return null;
    }

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
    
    // Type guard to check if defaultValue is ExplicitParameterValue (has 'value' property)
    if (defaultValue && 'value' in defaultValue) {
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
    if (!remoteConfig) {
      console.warn('⚠️ Firebase Remote Config is unavailable; cannot set parameter.');
      return false;
    }

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
