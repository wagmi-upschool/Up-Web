import { NextRequest, NextResponse } from "next/server";
import { getRemoteConfigValue } from "@/lib/firebase-admin";

// Remote configuration interface
interface RemoteConfig {
  [key: string]: {
    users: string[];
    url: string;
  };
}

// Fetch remote configuration from Firebase Remote Config
async function fetchRemoteConfig(): Promise<RemoteConfig> {
  try {
    console.log("📡 Fetching Mixpanel configuration from Firebase Remote Config");
    
    // Get the Mixpanel configuration from Firebase Remote Config
    const mixpanelConfig = await getRemoteConfigValue('UpWebMixpanelDashboard');
    
    if (mixpanelConfig && typeof mixpanelConfig === 'object') {
      console.log("✅ Successfully loaded Mixpanel config from Firebase Remote Config");
      return mixpanelConfig as RemoteConfig;
    }

    // Fallback: Use environment variable
    const envConfig = process.env.MIXPANEL_REMOTE_CONFIG;
    if (envConfig) {
      console.log("📡 Using fallback environment variable config");
      return JSON.parse(envConfig);
    }
    
    // Final fallback: Demo configuration
    console.log("🔄 Using fallback demo configuration");
    return {
      "denizbank": {
        "users": [
          "yusuffx03@gmail.com",
          "onat@wagmitech.co"
        ],
        "url": "https://eu.mixpanel.com/project/3422744/view/3926876/app/events"
      }
    };
  } catch (error) {
    console.error("❌ Error fetching remote config:", error);
    // Return demo config on error
    return {
      "denizbank": {
        "users": [
          "yusuffx03@gmail.com",
          "onat@wagmitech.co"
        ],
        "url": "https://eu.mixpanel.com/project/3422744/view/3926876/app/events"
      }
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authorization = request.headers.get("Authorization");
    
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    // Get user email from query parameter for demo purposes
    // In production, this should be extracted from the verified JWT token
    const userEmail = request.nextUrl.searchParams.get('email');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }
    
    console.log("🔍 Checking Mixpanel access for email:", userEmail);

    // Fetch remote configuration
    const remoteConfig = await fetchRemoteConfig();
    
    // Check if user has access to any Mixpanel dashboard
    let dashboardUrl = null;
    let hasAccess = false;
    let matchedOrg = null;

    // Check each organization's configuration
    for (const [orgName, config] of Object.entries(remoteConfig)) {
      // Check if user email or ID matches
      if (config.users.includes(userEmail)) {
        hasAccess = true;
        dashboardUrl = config.url;
        matchedOrg = orgName;
        console.log(`✅ User ${userEmail} has access to ${orgName} dashboard`);
        break;
      }
    }

    if (!hasAccess) {
      console.log(`❌ User ${userEmail} has no Mixpanel dashboard access`);
      return NextResponse.json({
        enabled: false,
        userEmail,
        dashboardUrl: null,
        message: "No dashboard access configured for this user"
      });
    }

    return NextResponse.json({
      enabled: true,
      userEmail,
      dashboardUrl,
      organization: matchedOrg,
      message: "Dashboard access granted"
    });

  } catch (error) {
    console.error("❌ Error in Mixpanel config API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

