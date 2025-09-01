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

    // Prepare the request data (matching AWS Lambda format)
    const requestData = {
      message: message,
      messageHistory: [], // Will be populated from conversation history
      assistantId: assistantId,
      conversationId: chatId,
    };

    // Use STREAM_URL from environment (Lambda URL expects no additional path)
    const STREAM_URL = process.env.STREAM_URL || "https://yxctstyidhdjvs5cvt57zewzlm0yownl.lambda-url.us-east-1.on.aws/";
    const url = STREAM_URL; // Lambda function handles routing internally

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

    // For streaming responses, we need to handle the stream
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Create a readable stream to pipe the response
      const stream = new ReadableStream({
        start(controller) {
          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              // Decode and forward the chunk
              const chunk = decoder.decode(value, { stream: true });
              console.log("[CHAT RESPONSE] Lambda chunk received:", {
                chunkLength: chunk.length,
                chunkPreview: chunk.substring(0, 100) + (chunk.length > 100 ? "..." : ""),
                containsDone: chunk.includes('[DONE-UP]'),
                url: url
              });
              controller.enqueue(new TextEncoder().encode(chunk));
              return pump();
            });
          }
          return pump();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Fallback for non-streaming response
    const data = await response.text();
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
