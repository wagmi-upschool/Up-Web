import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log("POST /api/quiz/[sessionId]/finish called");
  
  const sessionId = params.sessionId; // This is actually the conversationId
  console.log("Finishing quiz session (conversationId):", sessionId);

  // Get auth headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userId = req.headers.get("x-user-id");

  console.log("Auth headers:", { authHeader: !!authHeader, idTokenHeader: !!idTokenHeader, userId });

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

  try {
    const body = await req.json().catch(() => ({}));
    const { totalScore, completedAt } = body;

    console.log("Finishing quiz with:", { totalScore, completedAt });

    // Prepare request body for reinforcement finish API
    const reinforcementBody = {
      session_completed: true,
      total_score: totalScore || 0,
      completed_at: completedAt || new Date().toISOString()
    };

    console.log("Calling reinforcement finish API with:", reinforcementBody);

    // Call the real reinforcement finish API
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions/${sessionId}/finish`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    const response = await fetch(reinforcementUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reinforcementBody),
    });

    console.log("Reinforcement finish API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Reinforcement finish API error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to finish quiz session",
          error: errorData.error || "Unknown error from reinforcement API",
        },
        { status: response.status }
      );
    }

    const reinforcementData = await response.json();
    console.log("Reinforcement finish API success response:", reinforcementData);

    // Transform response to match our expected format
    const transformedResponse = {
      statusCode: 200,
      statusMessage: "Quiz session finished successfully",
      session: {
        id: sessionId,
        sessionId: sessionId,
        conversationId: sessionId,
        phase: "results" as const,
        completedAt: reinforcementData.completed_at || new Date().toISOString(),
        totalScore: reinforcementData.total_score || totalScore || 0,
        sessionCompleted: true,
        updatedAt: new Date().toISOString(),
      }
    };

    console.log("Returning transformed finish response:", transformedResponse);
    return NextResponse.json(transformedResponse, { status: 200 });

  } catch (error: any) {
    console.error("Error in POST /api/quiz/[sessionId]/finish:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to finish quiz session",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}