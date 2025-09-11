import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log(
    "[MESSAGE STREAM TEST] 🚀 POST /api/chats/[chatId]/conversation-save called (Flutter style)"
  );

  const { chatId } = params;
  console.log("[MESSAGE STREAM TEST] 📝 Chat ID:", chatId);

  // Get auth headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userId = req.headers.get("x-user-id");

  if (!authHeader || !idTokenHeader || !userId) {
    console.log("[MESSAGE STREAM TEST] ❌ Missing auth headers");
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
    const {
      assistantId,
      assistantGroupId,
      type,
      localDateTime,
      iconUrl,
      lastMessage,
      title,
      conversationId,
    } = body;
    let { messages } = body; // Use let for messages to allow reassignment

    console.log("[MESSAGE STREAM TEST] 📝 Flutter-style save request:", {
      assistantId,
      assistantGroupId,
      type,
      messagesCount: messages?.length || 0,
      conversationId,
      title,
    });

    console.log(
      "[MESSAGE STREAM TEST] 📝 Messages received for save:",
      messages.map((msg: any) => ({
        id: msg.id,
        identifier: msg.identifier,
        role: msg.role,
        content: msg.content?.substring(0, 50),
      }))
    );

    // Clean duplicate identifiers instead of rejecting
    const seenIdentifiers = new Set<string>();
    const cleanedMessages = messages.filter((msg: any) => {
      const identifier = msg.identifier || msg.id;
      if (seenIdentifiers.has(identifier)) {
        console.warn(
          "[MESSAGE STREAM TEST] ⚠️ Removing duplicate identifier:",
          identifier
        );
        return false; // Filter out duplicate
      }
      seenIdentifiers.add(identifier);
      return true; // Keep unique message
    });

    if (cleanedMessages.length !== messages.length) {
      console.log(
        "[MESSAGE STREAM TEST] 🧹 Cleaned duplicates:",
        messages.length - cleanedMessages.length,
        "removed"
      );
      messages = cleanedMessages; // Use cleaned messages
    }

    // Verify all messages have identifiers
    const messagesWithoutIdentifier = messages.filter(
      (msg: any) => !msg.identifier
    );
    if (messagesWithoutIdentifier.length > 0) {
      console.warn(
        "[MESSAGE STREAM TEST] ⚠️ Messages without identifier:",
        messagesWithoutIdentifier.length
      );
    }

    // Prepare request body exactly like Flutter
    const flutterStyleBody = {
      messages: messages,
      conversationId: conversationId || chatId,
      userId,
      localDateTime: localDateTime || new Date().toISOString(),
      lastMessage: lastMessage || messages[messages.length - 1]?.content,
      assistantId,
      assistantGroupId,
    };

    // Also prepare vectorData like Flutter (for vector/save endpoint)
    // Filter out widgets from vector save to prevent indexing widget content
    const messagesJsonForVector = messages
      .filter((msg: any) => msg.type !== "widget") // Widget'ları vector save'den filtrele
      .map((msg: any) => ({
        identifier: msg.identifier || msg.id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
        assistantId: msg.assistantId,
        type: msg.type,
      }));

    const vectorData = {
      ...flutterStyleBody,
      messages: messagesJsonForVector,
    };

    console.log(
      "[MESSAGE STREAM TEST] 💾 Sending conversation save with Flutter format:",
      {
        messagesCount: flutterStyleBody.messages.length,
        conversationId: flutterStyleBody.conversationId,
        lastMessage: flutterStyleBody.lastMessage?.substring(0, 30),
      }
    );

    console.log(
      "[MESSAGE STREAM TEST] 💾 Sending vector save with JSON format:",
      {
        messagesCount: vectorData.messages.length,
        sampleMessage: vectorData.messages[0],
      }
    );

    // Use idToken like Flutter does
    const tokenToUse = idTokenHeader || authHeader.replace("Bearer ", "");

    // Call both endpoints like Flutter does (Future.wait)
    const [backendResponse, vectorResponse] = await Promise.all([
      fetch(`${process.env.REMOTE_URL}/user/${userId}/conversation/save`, {
        method: "POST",
        headers: {
          Authorization: tokenToUse,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flutterStyleBody),
      }),
      fetch(`${process.env.REMOTE_URL}/user/${userId}/vector/save`, {
        method: "POST",
        headers: {
          Authorization: tokenToUse,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vectorData),
      }),
    ]);

    console.log(
      "[MESSAGE STREAM TEST] 🌐 Vector response status:",
      vectorResponse.status
    );

    console.log(
      "[MESSAGE STREAM TEST] 🌐 Backend response status:",
      backendResponse.status
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[MESSAGE STREAM TEST] ❌ Backend error:", errorText);
      throw new Error(
        `Backend error: ${backendResponse.status} - ${errorText}`
      );
    }

    const result = await backendResponse.json();
    console.log("[MESSAGE STREAM TEST] ✅ Backend success:", {
      conversationId: result.conversationId,
      status: result.status,
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Conversation saved successfully",
        conversationId: result.conversationId,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "[MESSAGE STREAM TEST] ❌ Error in conversation-save:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to save conversation",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
