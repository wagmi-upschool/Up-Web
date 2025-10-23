import { NextRequest, NextResponse } from "next/server";
import { apiLog, apiError } from "@/lib/logging-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  apiLog("GET /api/chats/[chatId]/messages called");

  const { chatId } = params;
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "50";

  apiLog("Chat ID:", chatId);
  apiLog("Limit:", limit);

  // Get both access token and id token
  const authHeader = req.headers.get("Authorization"); // access token
  const idTokenHeader = req.headers.get("x-id-token"); // id token

  apiLog("Auth header:", authHeader?.substring(0, 50) + "...");
  apiLog("ID Token header:", idTokenHeader?.substring(0, 50) + "...");

  if (!authHeader || !idTokenHeader) {
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 }
    );
  }

  const userId = req.headers.get("x-user-id");
  apiLog("User ID:", userId);

  if (!userId) {
    return NextResponse.json(
      {
        status: "401",
        message: "User ID not found",
      },
      { status: 401 }
    );
  }

  try {
    const url = `${process.env.REMOTE_URL}/user/${userId}/conversation/${chatId}/messages?limit=${limit}`;
    apiLog("Fetching from URL:", url);

    const lambdaAuthHeader = idTokenHeader.startsWith("Bearer ")
      ? idTokenHeader
      : `Bearer ${idTokenHeader}`;

    // Use idToken for Lambda authentication
    const lambda = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: lambdaAuthHeader,
        "Content-Type": "application/json",
      },
    });

    apiLog("Lambda response status:", lambda.status);

    if (lambda.status === 401) {
      apiLog("Lambda returned 401 Unauthorized");
      return NextResponse.json(
        {
          status: "401",
          message: "Unauthorized access to messages",
        },
        { status: 401 }
      );
    }

    const rawData = await lambda.json();
    apiLog("/api/chats/[chatId]/messages Raw Lambda response:", rawData);

    // Handle nested body structure like in chats API
    let data;
    if (rawData.body && typeof rawData.body === "string") {
      data = JSON.parse(rawData.body);
    } else if (rawData.body && typeof rawData.body === "object") {
      data = rawData.body;
    } else {
      data = rawData;
    }

    // Log first few messages for debugging
    data.messages.slice(0, 3).map((msg: any) => {
      apiLog(`Message ID: ${msg.type}, Created At: ${msg.content}`);
    });

    if (data && data.message === "Internal server error") {
      throw new Error("Failed to fetch messages");
    }

    // Safe sort with fallback
    const messages = data.messages || [];
    const sortedMessages = messages.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    apiLog(`Total messages fetched: ${sortedMessages.length}`);
    apiLog("📄 Sample message structure:", sortedMessages[0]);

    // Add content field to messages if missing but message field exists
    const processedMessages = sortedMessages.map((msg: any) => {
      if (!msg.content && msg.message) {
        return { ...msg, content: msg.message };
      }
      return msg;
    });

    apiLog(
      "After processing - content field exists:",
      !!processedMessages[0]?.content
    );

    return NextResponse.json({ messages: processedMessages }, { status: 200 });
  } catch (error: any) {
    apiError("Error in GET /api/chats/[chatId]/messages:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const { chatId } = params;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 }
    );
  }

  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      {
        status: "401",
        message: "User ID not found",
      },
      { status: 401 }
    );
  }

  try {
    const lambda = await fetch(
      `${process.env.REMOTE_URL}/conversation/remove?threadId=${chatId}&userId=${userId}` as string,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );
    await lambda.json();
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    apiError("Error in DELETE /api/chats/[chatId]/messages:", error);
    return NextResponse.json(
      { error: "Failed to delete messages" },
      { status: 500 }
    );
  }
}
