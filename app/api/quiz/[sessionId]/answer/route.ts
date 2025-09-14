import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log("POST /api/quiz/[sessionId]/answer called");
  
  const sessionId = params.sessionId; // This is actually the conversationId
  console.log("Conversation ID (sessionId):", sessionId);

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
    const body = await req.json();
    const { questionId, selectedOptionId, userAnswer, timeSpentSeconds } = body;
    
    console.log("Answer submission:", { questionId, selectedOptionId, userAnswer, timeSpentSeconds });

    // Prepare request body for reinforcement update API - try snake_case fields
    const reinforcementBody = {
      state: "answered",
      user_answer: userAnswer || selectedOptionId,
      time_spent_seconds: timeSpentSeconds || 0,
      selected_option_id: selectedOptionId
    };

    console.log("Calling reinforcement update API with:", reinforcementBody);

    // Call the real reinforcement update API - both as query parameters
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions?conversationId=${sessionId}&questionId=${questionId}`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    console.log("Calling reinforcement URL:", reinforcementUrl);
    console.log("Request body:", JSON.stringify(reinforcementBody, null, 2));

    const response = await fetch(reinforcementUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reinforcementBody),
    });

    console.log("Reinforcement update API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Reinforcement update API raw error response:", errorText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error("Error response is not JSON:", errorText);
        errorData = { message: errorText };
      }
      
      console.error("Reinforcement update API parsed error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to submit answer",
          error: (errorData as any).error || (errorData as any).message || "Unknown error from reinforcement API",
          rawError: errorText,
        },
        { status: response.status }
      );
    }

    const reinforcementData = await response.json();
    console.log("Reinforcement update API success response:", reinforcementData);

    // Transform response to match our expected format
    const transformedResponse = {
      statusCode: 200,
      statusMessage: "Answer submitted successfully",
      session: {
        id: sessionId,
        sessionId: sessionId,
        conversationId: sessionId,
        currentQuestionIndex: reinforcementData.current_question_index || 0,
        completedQuestions: reinforcementData.completed_questions || [questionId],
        totalQuestions: reinforcementData.total_questions,
        updatedAt: new Date().toISOString(),
      }
    };

    console.log("Returning transformed answer response:", transformedResponse);
    return NextResponse.json(transformedResponse, { status: 200 });

  } catch (error: any) {
    console.error("Error in POST /api/quiz/[sessionId]/answer:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to submit answer",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}