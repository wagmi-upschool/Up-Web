import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } },
) {
  console.log("POST /api/chats/[chatId]/send called");

  const { chatId } = params;
  console.log("Chat ID:", chatId);

  // Get both access token and id token
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");

  console.log("Auth header:", authHeader?.substring(0, 50) + "...");
  console.log("ID Token header:", idTokenHeader?.substring(0, 50) + "...");

  if (!authHeader || !idTokenHeader) {
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 },
    );
  }

  const userId = req.headers.get("x-user-id");
  console.log("User ID:", userId);

  if (!userId) {
    return NextResponse.json(
      {
        status: "401",
        message: "User ID not found",
      },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { message, assistantId } = body;

    if (!message || !assistantId) {
      return NextResponse.json(
        {
          status: "400",
          message: "Message and assistantId are required",
        },
        { status: 400 },
      );
    }

    console.log("[CHAT REQ] Sending message:", { message, assistantId, chatId });

    // This endpoint now only handles streaming calls
    // RTK Query uses /api/chats/[chatId]/message endpoint
    console.log("[CHAT STREAM] Processing streaming request");

    // Prepare the request data (matching AWS Lambda format)
    const requestData = {
      message: message,
      messageHistory: [], // Will be populated from conversation history
      assistantId: assistantId,
      conversationId: chatId,
    };

    const streamUrl =
      process.env.STREAM_URL || process.env.NEXT_PUBLIC_STREAM_URL;

    if (!streamUrl) {
      throw new Error("STREAM_URL environment variable is not configured.");
    }

    const url = streamUrl.replace(/\/+$/, "/"); // Lambda function handles routing internally

    console.log("[CHAT REQ] Streaming URL:", url);
    console.log("[CHAT REQ] Request headers:", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idTokenHeader?.substring(0, 20)}...`,
    });
    console.log("[CHAT REQ] Request body:", JSON.stringify(requestData, null, 2));

    // Use authentication headers required by AWS Lambda
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idTokenHeader}`, // AWS Lambda expects this format
      },
      body: JSON.stringify(requestData),
    });

    console.log("[CHAT RESPONSE] Stream response status:", response.status);
    console.log("[CHAT RESPONSE] Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("[CHAT RESPONSE] Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CHAT RESPONSE] Stream API error:", {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        url: url
      });
      return NextResponse.json(
        {
          status: response.status.toString(),
          message: `Stream API error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status },
      );
    }

    // Check if response has a body for streaming
    if (!response.body) {
      const textResponse = await response.text();
      console.log("[CHAT RESPONSE] No stream body, returning text:", textResponse.substring(0, 100));
      return new NextResponse(textResponse, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Stream the response directly from Lambda
    console.log("[CHAT RESPONSE] ✅ Proxying stream response from Lambda");
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/chats/[chatId]/send:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
