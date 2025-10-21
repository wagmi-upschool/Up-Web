import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Quiz access interface
interface QuizConfig {
  [groupName: string]: {
    users: string[];
    url: string;
    testId: string;
  };
}

// Fetch quiz configuration with graceful fallbacks
async function fetchQuizConfig(): Promise<QuizConfig> {
  // Start with environment variable as primary source
  let quizConfig: QuizConfig = {};

  const fallbackEnvConfig = process.env.QUIZ_DEFAULT_CONFIG;
  if (fallbackEnvConfig) {
    try {
      quizConfig = JSON.parse(fallbackEnvConfig) as QuizConfig;
      console.log("📡 Loaded quiz config from QUIZ_DEFAULT_CONFIG");
    } catch (error) {
      console.error("❌ Failed to parse QUIZ_DEFAULT_CONFIG:", error);
    }
  }

  // Try Firebase Remote Config as optional enhancement (but don't let it crash)
  try {
    console.log("📡 Attempting to load quiz config from Firebase Remote Config");
    const { getRemoteConfigValue } = await import("@/lib/firebase-admin");
    const remoteConfig = await getRemoteConfigValue("UpWebQuizDashboard", false);

    if (remoteConfig && typeof remoteConfig === "object") {
      console.log("✅ Successfully loaded quiz config from Firebase Remote Config");
      quizConfig = remoteConfig as QuizConfig;
    }
  } catch (firebaseError) {
    console.warn(
      "⚠️ Firebase Remote Config unavailable, using fallback:",
      firebaseError instanceof Error ? firebaseError.message : "Unknown error"
    );
  }

  return quizConfig;
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

    // Fetch quiz configuration with graceful error handling
    const quizConfig = await fetchQuizConfig();

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

    // If no group access AND no specific group was provided, check all groups for email
    if (!hasAccess && !userGroup) {
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
        hasAccess: false,
        error: "Configuration service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
