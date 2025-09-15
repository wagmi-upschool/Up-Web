import { NextRequest, NextResponse } from "next/server";
import { validateMixpanelUrl } from "@/lib/mixpanel-utils";
import {
  getRemoteConfigValue,
  setRemoteConfigValue,
} from "@/lib/firebase-admin";

// Admin configuration interface
interface MixpanelConfig {
  [orgName: string]: {
    users: string[];
    url: string;
  };
}

// Get current configuration from Firebase Remote Config
async function getCurrentConfig(): Promise<MixpanelConfig> {
  try {
    const config = await getRemoteConfigValue("UpWebMixpanelDashboard");

    if (config && typeof config === "object") {
      return config as MixpanelConfig;
    }

    // Return default config if nothing is found
    const defaultConfig = {
      denizbank: {
        users: [],
        url: "https://eu.mixpanel.com/project/3422744/view/3926876/app/events",
      },
    };
    return defaultConfig;
  } catch (error) {
    console.error("❌ [ADMIN] Error fetching current config:", error);
    return {};
  }
}

// Save configuration to Firebase Remote Config
async function saveConfiguration(config: MixpanelConfig): Promise<boolean> {
  try {
    return await setRemoteConfigValue(
      "UpWebMixpanelDashboard",
      config,
      "Mixpanel dashboard URLs and user access configuration for Up Web"
    );
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}

// GET - List all configurations
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, verify admin permissions here

    const configurations = await getCurrentConfig();

    return NextResponse.json({
      configurations,
      message:
        "Configuration retrieved successfully from Firebase Remote Config",
    });
  } catch (error) {
    console.error("❌ Error retrieving Mixpanel configuration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add or update configuration
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orgName, userEmail, dashboardUrl, action = "add" } = body;

    // Validate required fields
    if (!orgName || !userEmail || !dashboardUrl) {
      return NextResponse.json(
        { error: "Missing required fields: orgName, userEmail, dashboardUrl" },
        { status: 400 }
      );
    }

    // Validate URL
    if (!validateMixpanelUrl(dashboardUrl)) {
      return NextResponse.json(
        { error: "Invalid Mixpanel URL. Only Mixpanel domains are allowed." },
        { status: 400 }
      );
    }

    // Get current configuration
    const currentConfig = await getCurrentConfig();

    // Initialize organization if it doesn't exist
    if (!currentConfig[orgName]) {
      currentConfig[orgName] = {
        users: [],
        url: dashboardUrl,
      };
    }

    if (action === "add") {
      // Add user to organization
      if (!currentConfig[orgName].users.includes(userEmail)) {
        currentConfig[orgName].users.push(userEmail);
      }
      currentConfig[orgName].url = dashboardUrl;

      // Save updated configuration to Firebase Remote Config
      const saved = await saveConfiguration(currentConfig);

      if (!saved) {
        return NextResponse.json(
          { error: "Failed to save configuration to Firebase Remote Config" },
          { status: 500 }
        );
      }

      console.log(`✅ Added user ${userEmail} to ${orgName} dashboard access`);

      return NextResponse.json({
        success: true,
        message: `User ${userEmail} added to ${orgName} dashboard access`,
        configuration: currentConfig[orgName],
      });
    } else if (action === "remove") {
      // Remove user from organization
      const userIndex = currentConfig[orgName].users.indexOf(userEmail);
      if (userIndex > -1) {
        currentConfig[orgName].users.splice(userIndex, 1);
      }

      // If no users left, remove the organization
      if (currentConfig[orgName].users.length === 0) {
        delete currentConfig[orgName];
      }

      // Save updated configuration to Firebase Remote Config
      const saved = await saveConfiguration(currentConfig);

      if (!saved) {
        return NextResponse.json(
          { error: "Failed to save configuration to Firebase Remote Config" },
          { status: 500 }
        );
      }

      console.log(
        `✅ Removed user ${userEmail} from ${orgName} dashboard access`
      );

      return NextResponse.json({
        success: true,
        message: `User ${userEmail} removed from ${orgName} dashboard access`,
        configuration: currentConfig[orgName] || null,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error updating Mixpanel configuration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update entire configuration
export async function PUT(request: NextRequest) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { configurations } = body;

    if (!configurations || typeof configurations !== "object") {
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      );
    }

    // Validate all URLs in the configuration
    for (const [orgName, config] of Object.entries(
      configurations as MixpanelConfig
    )) {
      if (!validateMixpanelUrl(config.url)) {
        return NextResponse.json(
          { error: `Invalid Mixpanel URL for organization ${orgName}` },
          { status: 400 }
        );
      }
    }

    // Save the entire configuration to Firebase Remote Config
    const saved = await saveConfiguration(configurations as MixpanelConfig);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save configuration to Firebase Remote Config" },
        { status: 500 }
      );
    }

    console.log("✅ Updated entire Mixpanel configuration");

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully in Firebase Remote Config",
      configurations: configurations,
    });
  } catch (error) {
    console.error("❌ Error updating Mixpanel configuration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
