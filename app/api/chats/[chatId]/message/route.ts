import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } },
) {
  console.log("[RTK MESSAGE] POST /api/chats/[chatId]/message called");

  const { chatId } = params;
  console.log("[RTK MESSAGE] Chat ID:", chatId);

  // Get auth headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userId = req.headers.get("x-user-id");

  console.log("[RTK MESSAGE] Auth headers:", {
    hasAuthHeader: !!authHeader,
    hasIdToken: !!idTokenHeader,
    hasUserId: !!userId,
  });

  if (!authHeader || !idTokenHeader || !userId) {
    return NextResponse.json(
      {
        status: "401",
        message: "Authentication required",
      },
      { status: 401 }
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
        { status: 400 }
      );
    }

    console.log("[RTK MESSAGE] RTK Query message request:", { message: message.substring(0, 50) + "...", assistantId, chatId });

    // For RTK Query, just return a success response
    // The actual streaming will be handled by the separate /send endpoint
    return NextResponse.json({
      status: "success", 
      message: "Message received for processing",
      conversationId: chatId
    });

  } catch (error: any) {
    console.error("[RTK MESSAGE] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process message request",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}