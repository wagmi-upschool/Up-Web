import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Remote configuration interface
interface RemoteConfig {
  [key: string]: {
    users: string[];
    url: string;
    testId?: string;
  };
}

// Fetch remote configuration with graceful fallbacks
async function fetchRemoteConfig(): Promise<RemoteConfig | null> {
  // Try Firebase Remote Config first (but don't let it crash)
  try {
    console.log("📡 Attempting to load Mixpanel config from Firebase Remote Config");
    const { getRemoteConfigValue } = await import("@/lib/firebase-admin");
    const mixpanelConfig = await getRemoteConfigValue("UpWebMixpanelDashboard", false);

    if (mixpanelConfig && typeof mixpanelConfig === "object") {
      console.log("✅ Successfully loaded Mixpanel config from Firebase Remote Config");
      return mixpanelConfig as RemoteConfig;
    }
  } catch (firebaseError) {
    console.warn("⚠️ Firebase Remote Config unavailable, falling back to env vars:", firebaseError instanceof Error ? firebaseError.message : "Unknown error");
  }

  // Fallback to environment variables
  const envKeys = ["MIXPANEL_REMOTE_CONFIG", "MIXPANEL_DEFAULT_CONFIG"] as const;

  for (const key of envKeys) {
    try {
      const value = process.env[key];
      if (!value) continue;

      console.log(`📡 Using environment variable config from ${key}`);
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as RemoteConfig;
      }
    } catch (envError) {
      console.warn(
        `⚠️ Environment config ${key} invalid:`,
        envError instanceof Error ? envError.message : "Unknown error"
      );
    }
  }

  console.error("❌ No Mixpanel configuration available from any source");
  return null;
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

    // Fetch remote configuration with error handling
    const remoteConfig = await fetchRemoteConfig();

    if (!remoteConfig) {
      return NextResponse.json(
        {
          enabled: false,
          userEmail,
          dashboardUrl: null,
          message: "Mixpanel configuration unavailable",
        },
        { status: 200 }
      );
    }

    console.log("📊 Remote config loaded successfully");

    // Check if user has access to any Mixpanel dashboard
    let dashboardUrl = null;
    let hasAccess = false;
    let matchedOrg = null;

    // Check each organization's configuration
    for (const [orgName, config] of Object.entries(remoteConfig)) {
      // Ensure config has required properties
      if (!config || !config.users || !Array.isArray(config.users)) {
        console.warn(`⚠️ Invalid config for organization: ${orgName}`);
        continue;
      }

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
      {
        enabled: false,
        error: "Configuration service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
