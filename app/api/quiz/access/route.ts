import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { fetchQuizConfig } from "./quizConfig";
import { decodeJwt, JWTPayload } from "jose";
import crypto from "crypto";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    let userEmail =
      request.nextUrl.searchParams.get("email") ?? undefined;
    let userGroup =
      request.nextUrl.searchParams.get("groupName") ?? undefined;

    const rawToken = authorization.slice("Bearer ".length).trim();

    let tokenPayload: JWTPayload | null = null;

    try {
      tokenPayload = decodeJwt(rawToken);
    } catch (tokenError) {
      logger.quizAccess.validationError(
        "TOKEN_DECODE_FAILED",
        "Unable to decode access token for quiz access request"
      );
      console.warn("⚠️ Failed to decode access token:", tokenError);
    }

    if (!userEmail && tokenPayload) {
      const tokenEmail = tokenPayload.email;
      const username = tokenPayload["username"];
      const cognitoUsername = tokenPayload["cognito:username"];

      if (typeof tokenEmail === "string" && tokenEmail.length > 0) {
        userEmail = tokenEmail;
      } else if (typeof username === "string" && username.length > 0) {
        userEmail = username;
      } else if (
        typeof cognitoUsername === "string" &&
        cognitoUsername.length > 0
      ) {
        userEmail = cognitoUsername;
      }
    }

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

    if (!userGroup && tokenPayload) {
      const customGroup = tokenPayload["custom:groupName"];
      const cognitoGroups = tokenPayload["cognito:groups"];

      if (typeof customGroup === "string" && customGroup.length > 0) {
        userGroup = customGroup;
      } else if (Array.isArray(cognitoGroups) && cognitoGroups.length > 0) {
        userGroup = String(cognitoGroups[0]);
      } else if (
        typeof cognitoGroups === "string" &&
        cognitoGroups.length > 0
      ) {
        userGroup = cognitoGroups;
      }
    }

    // Fetch quiz configuration with graceful error handling
    const quizConfig = await fetchQuizConfig();

    if (!userGroup) {
      // Attempt to infer user group from quiz config user list
      for (const [groupName, config] of Object.entries(quizConfig)) {
        if (Array.isArray(config.users) && config.users.includes(userEmail)) {
          userGroup = groupName;
          logger.quizAccess.validationError(
            "GROUP_INFERRED_FROM_CONFIG",
            `User group inferred from quiz config for email: ${userEmail}`
          );
          console.log(
            `ℹ️ Inferred quiz group ${groupName} for ${userEmail} from configuration`
          );
          break;
        }
      }
    }

    if (!userGroup) {
      logger.quizAccess.validationError(
        "MISSING_GROUP",
        `Unable to determine user group for email: ${userEmail}`
      );
      return NextResponse.json(
        {
          error:
            "Unable to determine group name. Ensure the Cognito token includes custom:groupName or add the user to a configured group.",
        },
        { status: 400 }
      );
    }

    const resolvedGroup = userGroup;

    // Log access check start
    logger.quizAccess.checkStarted(userEmail, resolvedGroup, requestId);
    console.log(
      "🔍 Checking quiz access for user:",
      userEmail,
      "group:",
      resolvedGroup
    );

    // Group-based access: If the group exists in config and has a testId, grant access
    if (quizConfig[resolvedGroup] && quizConfig[resolvedGroup].testId) {
      const config = quizConfig[resolvedGroup];

      // Log access granted
      logger.quizAccess.accessGranted(
        userEmail,
        resolvedGroup,
        config.testId,
        config.url
      );

      console.log(
        `✅ User ${userEmail} has quiz access via group ${resolvedGroup} (testId: ${config.testId})`
      );

      return NextResponse.json({
        hasAccess: true,
        userEmail,
        groupName: resolvedGroup,
        testId: config.testId,
        testUrl: config.url,
        message: "Quiz access granted",
        requestId,
      });
    }

    // No access - group doesn't exist or doesn't have testId
    const reason = !quizConfig[resolvedGroup]
      ? "Group not found in configuration"
      : "Group exists but no testId configured";

    logger.quizAccess.accessDenied(userEmail, resolvedGroup, reason);

    console.log(`❌ User ${userEmail} has no quiz access (group: ${resolvedGroup} not found or no testId)`);
    return NextResponse.json({
      hasAccess: false,
      userEmail,
      groupName: resolvedGroup,
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
