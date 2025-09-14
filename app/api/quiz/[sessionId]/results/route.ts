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
    console.log("Reinforcement results API success response:", JSON.stringify(reinforcementData, null, 2));

    // Calculate results from the questions data
    const questions = reinforcementData.questions || [];
    const answeredQuestions = questions.filter((q: any) => q.state === "answered");
    
    console.log("Total questions from backend:", questions.length);
    console.log("Answered questions:", answeredQuestions.length);
    
    // If backend returned empty questions but we have a session, try to get questions count from total_questions
    if (questions.length === 0 && reinforcementData.total_questions > 0) {
      console.log("Backend returned empty questions array but total_questions is:", reinforcementData.total_questions);
      console.log("This indicates a backend data persistence issue");
      
      // Return a warning response that the frontend can handle
      const fallbackResults = {
        sessionId: sessionId,
        conversationId: sessionId,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        totalQuestions: reinforcementData.total_questions || 0,
        completedAt: reinforcementData.session_completed_at || new Date().toISOString(),
        answers: {},
        timeSpent: 0,
        assistantId: reinforcementData.assistant_id,
        title: reinforcementData.title,
        questions: [],
        error: "backend_data_missing",
        message: "Backend returned empty questions array. This is a known data persistence issue."
      };
      
      console.log("Returning fallback results due to empty questions:", fallbackResults);
      return NextResponse.json(fallbackResults, { status: 200 });
    }
    
    // Debug correct answer logic - only check questions that are actually answered
    const correctAnswers = answeredQuestions.filter((q: any) => {
      const userAnswer = q.user_answer || q.userAnswer;
      const correctAnswer = q.answer_text;
      
      // Must have a user answer to be considered
      if (!userAnswer) {
        console.log(`Question ${q.sequence_number}: No user answer provided -> false`);
        return false;
      }
      
      const isCorrect = userAnswer === correctAnswer;
      
      if (!isCorrect) {
        console.log(`Question ${q.sequence_number}: User="${userAnswer}" vs Correct="${correctAnswer}" -> ${isCorrect}`);
      }
      
      return isCorrect;
    }).length;
    
    const totalQuestions = answeredQuestions.length; // Use answered questions for score calculation
    const incorrectAnswers = answeredQuestions.length - correctAnswers;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    console.log("Correct answers found:", correctAnswers);
    console.log("Calculated score:", score);
    const totalTimeSpent = questions.reduce((total: number, q: any) => total + (q.time_spent_seconds || q.timeSpentSeconds || 0), 0);

    // Transform answers to expected format
    const answers: { [key: string]: string } = {};
    questions.forEach((q: any, index: number) => {
      // Try both snake_case and camelCase field names for user answers
      const userAnswer = q.user_answer || q.userAnswer;
      if (userAnswer) {
        // Use actual questionId from the data, fallback to index-based ID
        const questionKey = q.question_id || `question-${index + 1}`;
        answers[questionKey] = userAnswer;
      }
    });

    // Transform response to match our expected format
    const transformedResults = {
      sessionId: sessionId,
      conversationId: sessionId,
      score: score,
      correctAnswers: correctAnswers,
      incorrectAnswers: incorrectAnswers,
      totalQuestions: questions.length, // Always show total questions from backend
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
        userAnswer: q.user_answer || q.userAnswer,
        timeSpentSeconds: q.time_spent_seconds || q.timeSpentSeconds,
        isCorrect: (q.user_answer || q.userAnswer) ? (q.user_answer || q.userAnswer) === q.answer_text : false
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