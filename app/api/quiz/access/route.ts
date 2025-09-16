import { NextRequest, NextResponse } from "next/server";
import { getFirebaseRemoteConfig } from "@/lib/firebase-config";

// Quiz access interface
interface QuizConfig {
  [groupName: string]: {
    users: string[];
    url: string;
    testId: string;
  };
}

// Check if user has quiz access based on their group
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

    // Get user email from query parameter
    // In production, this should be extracted from the verified JWT token
    const userEmail = request.nextUrl.searchParams.get("email");
    const userGroup = request.nextUrl.searchParams.get("groupName");

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    console.log(
      "🔍 Checking quiz access for user:",
      userEmail,
      "group:",
      userGroup
    );

    // Fetch quiz configuration from Firebase Remote Config
    // Initialize with fallback configuration to prevent undefined errors
    let quizConfig: QuizConfig = {
      default: {
        users: ["wagmiup@gmail.com"],
        url: "https://www.linkedin.com/feed/",
        testId: "681c295a-3253-49cb-8354-3da490bfb6da",
      },
    };

    try {
      const remoteConfig = await getFirebaseRemoteConfig("UpWebMixpanelDashboard");

      if (remoteConfig && typeof remoteConfig === "object") {
        console.log(
          "✅ Successfully loaded quiz config from Firebase Remote Config"
        );
        quizConfig = remoteConfig as QuizConfig;
      } else {
        // Fallback configuration
        console.log("🔄 Using fallback quiz configuration");
        quizConfig = {
          default: {
            users: [
              "yusuffx03@gmail.com",
              "onat@wagmitech.co",
              "wagmiup@gmail.com",
              "yusuff2403@gmail.com",
            ],
            url: "https://www.linkedin.com/feed/",
            testId: "681c295a-3253-49cb-8354-3da490bfb6da",
          },
        };
      }
    } catch (error) {
      console.error("❌ Error fetching quiz config:", error);
      // Use fallback config on error (already initialized above)
      console.log("🔄 Using fallback quiz configuration");
    }

    // Check user access based on group or email
    let hasAccess = false;
    let matchedGroup = null;
    let testId = null;
    let testUrl = null;

    // If user has a group, check that group first
    if (userGroup && quizConfig[userGroup]) {
      if (quizConfig[userGroup].users.includes(userEmail)) {
        hasAccess = true;
        matchedGroup = userGroup;
        testId = quizConfig[userGroup].testId;
        testUrl = quizConfig[userGroup].url;
        console.log(
          `✅ User ${userEmail} has quiz access via group ${userGroup}`
        );
      }
    }

    // If no group access, check all groups for email
    if (!hasAccess) {
      for (const [groupName, config] of Object.entries(quizConfig)) {
        if (config.users.includes(userEmail)) {
          hasAccess = true;
          matchedGroup = groupName;
          testId = config.testId;
          testUrl = config.url;
          console.log(
            `✅ User ${userEmail} has quiz access via group ${groupName}`
          );
          break;
        }
      }
    }

    if (!hasAccess) {
      console.log(`❌ User ${userEmail} has no quiz access`);
      return NextResponse.json({
        hasAccess: false,
        userEmail,
        message: "No quiz access configured for this user",
      });
    }

    return NextResponse.json({
      hasAccess: true,
      userEmail,
      groupName: matchedGroup,
      testId,
      testUrl,
      message: "Quiz access granted",
    });
  } catch (error) {
    console.error("❌ Error in quiz access API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
