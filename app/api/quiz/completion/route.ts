import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Check if user has completed a quiz for a specific assistant
 * Uses PATCH method from the backend to check conversation existence
 */
export async function GET(request: NextRequest) {
  console.log("GET /api/quiz/completion called");

  // Get auth headers
  const authHeader = request.headers.get("Authorization");
  const idTokenHeader = request.headers.get("x-id-token");
  const userId = request.headers.get("x-user-id");

  console.log("Auth headers:", {
    authHeader: !!authHeader,
    idTokenHeader: !!idTokenHeader,
    userId,
  });

  if (!authHeader || !userId) {
    console.log("Missing auth headers");
    return NextResponse.json(
      {
        statusCode: 401,
        statusMessage: "Authentication required",
        error: "Missing auth headers",
      },
      { status: 401 }
    );
  }

  // Get assistantId from query parameters
  const assistantId = request.nextUrl.searchParams.get("assistantId");

  if (!assistantId) {
    console.log("Missing assistantId parameter");
    return NextResponse.json(
      {
        statusCode: 400,
        statusMessage: "Bad request",
        error: "assistantId query parameter is required",
      },
      { status: 400 }
    );
  }

  console.log("Checking quiz completion for:", {
    userId,
    assistantId,
  });

  try {
    // Use the PATCH endpoint to check if user has existing conversation with the assistant
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions?assistantId=${assistantId}`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    console.log("Calling reinforcement PATCH API:", reinforcementUrl);

    const response = await fetch(reinforcementUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Reinforcement PATCH API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Reinforcement PATCH API error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to check quiz completion",
          error: errorData.error || "Unknown error from reinforcement API",
        },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    console.log("Reinforcement PATCH API success response:", responseData);

    // Determine completion status
    const isCompleted = responseData.has_conversation === true;

    const completionResponse = {
      statusCode: 200,
      statusMessage: "Quiz completion status retrieved successfully",
      userId: responseData.user_id,
      assistantId: responseData.assistant_id,
      isCompleted: isCompleted,
      hasConversation: responseData.has_conversation,
      lastConversationId: responseData.last_conversation_id || null,
      lastUpdatedAt: responseData.last_updated_at || null,
    };

    console.log("Returning completion response:", completionResponse);
    return NextResponse.json(completionResponse, { status: 200 });

  } catch (error: any) {
    console.error("Error in GET /api/quiz/completion:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to check quiz completion",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}