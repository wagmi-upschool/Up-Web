import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Quiz access interface
interface QuizConfig {
  [groupName: string]: {
    users?: string[]; // Optional for backward compatibility
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

    // Get user email and group from query parameters
    // In production, groupName should be extracted from the verified JWT token (Cognito custom attributes)
    const userEmail = request.nextUrl.searchParams.get("email");
    const userGroup = request.nextUrl.searchParams.get("groupName");

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    if (!userGroup) {
      return NextResponse.json(
        { error: "Group name is required (from Cognito custom attributes)" },
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

    // Group-based access: If the group exists in config and has a testId, grant access
    if (quizConfig[userGroup] && quizConfig[userGroup].testId) {
      const config = quizConfig[userGroup];
      console.log(
        `✅ User ${userEmail} has quiz access via group ${userGroup} (testId: ${config.testId})`
      );

      return NextResponse.json({
        hasAccess: true,
        userEmail,
        groupName: userGroup,
        testId: config.testId,
        testUrl: config.url,
        message: "Quiz access granted",
      });
    }

    // No access - group doesn't exist or doesn't have testId
    console.log(`❌ User ${userEmail} has no quiz access (group: ${userGroup} not found or no testId)`);
    return NextResponse.json({
      hasAccess: false,
      userEmail,
      groupName: userGroup,
      message: "No quiz access configured for this group",
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
