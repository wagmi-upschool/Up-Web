import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("POST /api/quiz/start called");

  // Get auth headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userId = req.headers.get("x-user-id");

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

  try {
    const body = await req.json();
    const { assistantId, assistantGroupId, type, title, questionCount } = body;

    console.log("Quiz start request:", {
      assistantId,
      assistantGroupId,
      type,
      title,
      questionCount,
    });

    // Prepare request body for reinforcement API
    const reinforcementBody = {
      assistant_id: assistantId,
      question_count: 5,
      assistantGroupId: assistantGroupId,
      type: type || "fill-in-blanks",
      title: title || "Quiz Session",
    };

    console.log("Calling reinforcement API with:", reinforcementBody);

    // Call the real reinforcement API
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    const response = await fetch(reinforcementUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reinforcementBody),
    });

    console.log("Reinforcement API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Reinforcement API error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to start quiz session",
          error: errorData.error || "Unknown error from reinforcement API",
        },
        { status: response.status }
      );
    }

    const reinforcementData = await response.json();
    console.log("Reinforcement API success response:", reinforcementData);

    // Transform response to match our expected format
    const transformedResponse = {
      statusCode: 200,
      statusMessage: "Quiz session created successfully",
      sessionId: reinforcementData.conversation_id, // Use conversation_id as session_id
      conversationId: reinforcementData.conversation_id,
      totalQuestions:
        reinforcementData.total_questions ||
        reinforcementData.questions?.length ||
        5,
      questions: reinforcementData.questions || [],
      assistantId: reinforcementData.assistant_id,
      agentType: reinforcementData.agent_type,
    };

    console.log("Returning transformed response:", transformedResponse);
    return NextResponse.json(transformedResponse, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/quiz/start:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to start quiz session",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
