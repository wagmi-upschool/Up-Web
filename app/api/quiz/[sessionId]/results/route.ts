import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.log("GET /api/quiz/[sessionId]/results called");
  
  const sessionId = params.sessionId; // This is actually the conversationId
  console.log("Getting results for session (conversationId):", sessionId);

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
    // Call the real reinforcement results API
    const reinforcementUrl = `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions/${sessionId}/results?conversationId=${sessionId}`;
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    console.log("Calling reinforcement results API:", reinforcementUrl);

    const response = await fetch(reinforcementUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Reinforcement results API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Reinforcement results API error:", errorData);
      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to retrieve quiz results",
          error: errorData.error || "Unknown error from reinforcement API",
        },
        { status: response.status }
      );
    }

    const reinforcementData = await response.json();
    console.log("Reinforcement results API success response:", reinforcementData);

    // Calculate results from the questions data
    const questions = reinforcementData.questions || [];
    const answeredQuestions = questions.filter((q: any) => q.state === "answered");
    const correctAnswers = answeredQuestions.filter((q: any) => q.user_answer === q.answer_text || q.user_answer === q.correct_answer_id).length;
    const totalQuestions = questions.length;
    const incorrectAnswers = answeredQuestions.length - correctAnswers;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const totalTimeSpent = questions.reduce((total: number, q: any) => total + (q.time_spent_seconds || 0), 0);

    // Transform answers to expected format
    const answers: { [key: string]: string } = {};
    questions.forEach((q: any, index: number) => {
      if (q.user_answer) {
        answers[`question-${index + 1}`] = q.user_answer;
      }
    });

    // Transform response to match our expected format
    const transformedResults = {
      sessionId: sessionId,
      conversationId: sessionId,
      score: score,
      correctAnswers: correctAnswers,
      incorrectAnswers: incorrectAnswers,
      totalQuestions: totalQuestions,
      completedAt: reinforcementData.session_completed_at || new Date().toISOString(),
      answers: answers,
      timeSpent: totalTimeSpent,
      assistantId: reinforcementData.assistant_id,
      title: reinforcementData.title,
      questions: questions.map((q: any, index: number) => ({
        id: q.question_id,
        questionId: q.question_id,
        title: q.question_text,
        description: q.answer_text ? `Cevap: ${q.answer_text}` : undefined,
        options: q.options || [],
        correctOptionId: q.correct_answer_id,
        sequenceNumber: q.sequence_number || (index + 1),
        state: q.state || "initial",
        userAnswer: q.user_answer,
        timeSpentSeconds: q.time_spent_seconds,
        isCorrect: q.user_answer === q.answer_text || q.user_answer === q.correct_answer_id
      }))
    };

    console.log("Returning transformed results:", transformedResults);
    return NextResponse.json(transformedResults, { status: 200 });

  } catch (error: any) {
    console.error("Error in GET /api/quiz/[sessionId]/results:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        statusMessage: "Failed to retrieve quiz results",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}