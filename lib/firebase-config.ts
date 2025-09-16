// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEKpPwUiMKAftn-k9YJe1rzUyiTFOb34A",
  authDomain: "upcompaniontest.firebaseapp.com",
  projectId: "upcompaniontest",
  storageBucket: "upcompaniontest.firebasestorage.app",
  messagingSenderId: "559428295598",
  appId: "1:559428295598:web:43be18ad24764419a5863f",
  measurementId: "G-VNDZ10MJZD"
};

/**
 * Fetch Remote Config value using Firebase REST API
 */
export async function getFirebaseRemoteConfig(parameter: string): Promise<any> {
  try {
    console.log(`🔄 Fetching Remote Config value for: ${parameter} using REST API`);

    // Use Firebase REST API to get Remote Config
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${firebaseConfig.projectId}/remoteConfig`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Firebase Remote Config API error: ${response.status} ${response.statusText}`);
    }

    const remoteConfigData = await response.json();

    // Extract parameter value
    const parameters = remoteConfigData.parameters || {};
    const parameterData = parameters[parameter];

    if (!parameterData) {
      console.warn(`⚠️ Remote Config parameter '${parameter}' not found`);
      return null;
    }

    // Get default value
    const defaultValue = parameterData.defaultValue?.value;

    if (!defaultValue) {
      console.warn(`⚠️ No default value for parameter '${parameter}'`);
      return null;
    }

    // Try to parse as JSON
    let parsedValue;
    try {
      parsedValue = JSON.parse(defaultValue);
      console.log(`✅ Successfully retrieved and parsed Remote Config value for '${parameter}'`);
    } catch {
      parsedValue = defaultValue;
      console.log(`✅ Successfully retrieved Remote Config value for '${parameter}' (as string)`);
    }

    return parsedValue;

  } catch (error) {
    console.error(`❌ Error retrieving Remote Config parameter '${parameter}':`, error);
    throw error;
  }
}

export { firebaseConfig };