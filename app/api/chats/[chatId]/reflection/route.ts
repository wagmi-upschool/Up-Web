import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log(
    "[REFLECTION STREAM] 🌊 POST /api/chats/[chatId]/reflection called"
  );

  const { chatId } = params;
  console.log("[REFLECTION STREAM] 📝 Chat ID:", chatId);

  // Get auth headers - consistent with other working endpoints
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userId = req.headers.get("x-user-id");

  console.log("[REFLECTION STREAM] Auth headers check:", {
    hasAuthHeader: !!authHeader,
    hasIdToken: !!idTokenHeader,
    hasUserId: !!userId,
    authHeaderPreview: authHeader?.substring(0, 50) + "...",
    idTokenPreview: idTokenHeader?.substring(0, 50) + "...",
  });

  // Require same auth headers as other endpoints
  if (!authHeader || !idTokenHeader || !userId) {
    console.log("[REFLECTION STREAM] ❌ Missing required auth headers");
    return NextResponse.json(
      {
        status: "401",
        message:
          "Authentication required - missing Authorization, x-id-token, or x-user-id headers",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { query, assistantId } = body;

    console.log("[REFLECTION STREAM] 📝 Reflection request:", {
      query: query?.substring(0, 50) + "...",
      assistantId,
      userId,
      chatId,
    });

    const reflectionBaseUrl =
      process.env.REFLECTION_API_BASE_URL ||
      process.env.NEXT_PUBLIC_REFLECTION_API_BASE_URL;

    if (!reflectionBaseUrl) {
      throw new Error(
        "REFLECTION_API_BASE_URL environment variable is not configured."
      );
    }

    const normalizedBaseUrl = reflectionBaseUrl.replace(/\/+$/, "");
    const REFLECTION_URL = `${normalizedBaseUrl}/user/${userId}/conversation/${chatId}/reflection/stream`;
    console.log(
      "[REFLECTION STREAM] 🌐 Calling reflection stream URL:",
      REFLECTION_URL
    );

    // Flutter-style reflection request format
    const requestData = {
      query: query, // Use 'query' field like Flutter
      assistantId: assistantId,
      latestMessage: undefined, // Flutter sends latestMessage if available
      conversationId: chatId,
      stage: process.env.REMOTE_URL?.includes("myenv") ? "myenv" : "upwagmitec",
    };

    console.log("[REFLECTION STREAM] 📝 Request headers:", {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idTokenHeader?.substring(0, 20)}...`,
    });
    console.log(
      "[REFLECTION STREAM] 📝 Request body:",
      JSON.stringify(requestData, null, 2)
    );

    const response = await fetch(REFLECTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idTokenHeader}`, // Backend expects 'Bearer ' prefix
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    console.log(
      "[REFLECTION STREAM] 🌐 External response status:",
      response.status
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REFLECTION STREAM] ❌ External API error:", errorText);
      return NextResponse.json(
        {
          error: "Reflection stream failed",
          details: errorText,
        },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        {
          error: "No response body for streaming",
        },
        { status: 500 }
      );
    }

    // Return the stream response
    console.log("[REFLECTION STREAM] ✅ Proxying stream response");

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("[REFLECTION STREAM] ❌ Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process reflection stream",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
