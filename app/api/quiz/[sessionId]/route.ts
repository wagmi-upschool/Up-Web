import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log("GET /api/quiz/[sessionId] called");
  
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
    // Call the real reinforcement resume API
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions?conversationId=${sessionId}`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    console.log("Calling reinforcement resume API:", reinforcementUrl);

    const response = await fetch(reinforcementUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Reinforcement resume API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Reinforcement resume API error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to resume quiz session",
          error: errorData.error || "Unknown error from reinforcement API",
        },
        { status: response.status }
      );
    }

    const reinforcementData = await response.json();
    console.log("Reinforcement resume API success response:", reinforcementData);

    // Transform the questions to match our expected format
    const transformedQuestions = (reinforcementData.questions || []).map((q: any, index: number) => ({
      id: q.question_id,
      questionId: q.question_id,
      title: q.question_text,
      description: q.answer_text ? `Cevap: ${q.answer_text}` : undefined,
      options: q.options || [], // For fill-in-blanks, this might be empty
      correctOptionId: q.correct_answer_id,
      sequenceNumber: q.sequence_number || (index + 1),
      state: q.state || "initial",
      userAnswer: q.user_answer,
      timeSpentSeconds: q.time_spent_seconds,
    }));

    // Transform response to match our expected format
    const transformedResponse = {
      statusCode: 200,
      statusMessage: "Quiz session retrieved successfully",
      session: {
        id: sessionId,
        sessionId: sessionId,
        conversationId: sessionId,
        assistantId: reinforcementData.assistant_id,
        assistantGroupId: reinforcementData.assistantGroupId,
        title: reinforcementData.title || "Quiz Session",
        description: "Reinforcement session from backend",
        totalQuestions: reinforcementData.total_questions || transformedQuestions.length,
        currentQuestionIndex: 0,
        completedQuestions: transformedQuestions.filter((q: any) => q.state === "answered").map((q: any) => q.questionId),
        phase: "question" as const,
        createdAt: reinforcementData.session_started ? 
          new Date(reinforcementData.session_started * 1000).toISOString() : 
          new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: transformedQuestions,
        agentType: reinforcementData.agent_type,
      }
    };

    console.log("Returning transformed session data:", transformedResponse);
    return NextResponse.json(transformedResponse, { status: 200 });

  } catch (error: any) {
    console.error("Error in GET /api/quiz/[sessionId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to retrieve quiz session",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}