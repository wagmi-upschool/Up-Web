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

    // Validate required fields
    if (!assistantId || !assistantGroupId) {
      console.error("Missing required fields:", {
        assistantId,
        assistantGroupId,
      });
      return NextResponse.json(
        {
          statusCode: 400,
          statusMessage: "Bad Request",
          error:
            "Missing required fields: assistantId and assistantGroupId are required",
        },
        { status: 400 }
      );
    }

    // Prepare request body for reinforcement API
    const reinforcementBody = {
      assistant_id: assistantId,
      question_count: 20, // Ensure reasonable range
      assistantGroupId: assistantGroupId,
      type: "quiz", // Use flashcard as default instead of fill-in-blanks
      title: title || "Quiz Session",
    };

    console.log("Calling reinforcement API with:", reinforcementBody);
    console.log(
      "Target URL:",
      `${process.env.REMOTE_URL}/user/${userId}/reinforcement/sessions`
    );

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
    console.log(
      "Reinforcement API response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Reinforcement API error response text:", errorText);

      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error("Failed to parse error response as JSON:", parseError);
        errorData = { error: "Invalid response format", message: errorText };
      }

      console.error("Reinforcement API error data:", errorData);

      // Log the full request details for debugging
      console.error("Request details for debugging:", {
        url: reinforcementUrl,
        method: "POST",
        body: reinforcementBody,
        userId: userId,
        hasToken: !!tokenToUse,
        tokenLength: tokenToUse?.length,
      });

      return NextResponse.json(
        {
          statusCode: response.status,
          statusMessage: "Failed to start quiz session",
          error:
            errorData.error ||
            errorData.message ||
            "Unknown error from reinforcement API",
          details:
            "The backend reinforcement API returned an error. Please check the server logs.",
        },
        { status: response.status }
      );
    }

    let reinforcementData;
    try {
      reinforcementData = await response.json();
      console.log("Reinforcement API success response:", reinforcementData);
    } catch (parseError) {
      console.error("Failed to parse reinforcement API response:", parseError);
      return NextResponse.json(
        {
          statusCode: 500,
          statusMessage: "Invalid JSON response from reinforcement API",
          error: "Failed to parse API response",
        },
        { status: 500 }
      );
    }

    // Validate reinforcement data structure
    if (!reinforcementData || typeof reinforcementData !== "object") {
      console.error(
        "Invalid reinforcement API response structure:",
        reinforcementData
      );
      return NextResponse.json(
        {
          statusCode: 500,
          statusMessage: "Invalid response from reinforcement API",
          error: "API returned invalid data structure",
        },
        { status: 500 }
      );
    }

    // Transform response to match our expected format
    const transformedResponse = {
      statusCode: 200,
      statusMessage: "Quiz session created successfully",
      sessionId: reinforcementData.conversation_id, // Use conversation_id as session_id
      conversationId: reinforcementData.conversation_id,
      totalQuestions:
        reinforcementData.total_questions ||
        (Array.isArray(reinforcementData.questions)
          ? reinforcementData.questions.length
          : 0) ||
        5,
      questions: Array.isArray(reinforcementData.questions)
        ? reinforcementData.questions
        : [],
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
