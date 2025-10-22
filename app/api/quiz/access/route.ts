import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import crypto from "crypto";

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

// Fetch quiz configuration from Firebase Remote Config only
async function fetchQuizConfig(): Promise<QuizConfig> {
  let quizConfig: QuizConfig = {};

  try {
    console.log("📡 Attempting to load quiz config from Firebase Remote Config");
    const { getRemoteConfigValue } = await import("@/lib/firebase-admin");
    const remoteConfig = await getRemoteConfigValue("UpWebQuizDashboard", false);

    if (remoteConfig && typeof remoteConfig === "object") {
      quizConfig = remoteConfig as QuizConfig;
      const groupCount = Object.keys(quizConfig).length;
      logger.quizAccess.configLoadSuccess("Firebase Remote Config", groupCount);
      console.log("✅ Successfully loaded quiz config from Firebase Remote Config");
    } else {
      logger.quizAccess.configLoadFailed(
        "Firebase Remote Config",
        new Error("Config not found or invalid format")
      );
      console.warn("⚠️ Firebase Remote Config returned empty or invalid config");
    }
  } catch (firebaseError) {
    const err = firebaseError instanceof Error ? firebaseError : new Error(String(firebaseError));
    logger.quizAccess.configLoadFailed("Firebase Remote Config", err);
    console.error(
      "❌ Firebase Remote Config unavailable:",
      firebaseError instanceof Error ? firebaseError.message : "Unknown error"
    );
  }

  return quizConfig;
}

// Check if user has quiz access based on their group
export async function GET(request: NextRequest) {
  // Generate unique request ID for tracking
  const requestId = crypto.randomUUID();

  try {
    // Get authorization header
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      logger.quizAccess.validationError(
        "MISSING_AUTH_HEADER",
        "Authorization header missing or invalid"
      );
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
      logger.quizAccess.validationError(
        "MISSING_EMAIL",
        "User email parameter not provided"
      );
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    if (!userGroup) {
      logger.quizAccess.validationError(
        "MISSING_GROUP",
        `User group parameter not provided for email: ${userEmail}`
      );
      return NextResponse.json(
        { error: "Group name is required (from Cognito custom attributes)" },
        { status: 400 }
      );
    }

    // Log access check start
    logger.quizAccess.checkStarted(userEmail, userGroup, requestId);
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

      // Log access granted
      logger.quizAccess.accessGranted(
        userEmail,
        userGroup,
        config.testId,
        config.url
      );

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
        requestId,
      });
    }

    // No access - group doesn't exist or doesn't have testId
    const reason = !quizConfig[userGroup]
      ? "Group not found in configuration"
      : "Group exists but no testId configured";

    logger.quizAccess.accessDenied(userEmail, userGroup, reason);

    console.log(`❌ User ${userEmail} has no quiz access (group: ${userGroup} not found or no testId)`);
    return NextResponse.json({
      hasAccess: false,
      userEmail,
      groupName: userGroup,
      message: "No quiz access configured for this group",
      requestId,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.quizAccess.systemError(err, { requestId });

    console.error("❌ Error in quiz access API:", error);
    return NextResponse.json(
      {
        hasAccess: false,
        error: "Configuration service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 200 }
    );
  }
}
