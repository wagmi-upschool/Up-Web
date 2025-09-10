import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  console.log("GET /api/chats/[chatId]/messages called");

  const { chatId } = params;
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "50";

  console.log("Chat ID:", chatId);
  console.log("Limit:", limit);

  // Get both access token and id token
  const authHeader = req.headers.get("Authorization"); // access token
  const idTokenHeader = req.headers.get("x-id-token"); // id token

  console.log("Auth header:", authHeader?.substring(0, 50) + "...");
  console.log("ID Token header:", idTokenHeader?.substring(0, 50) + "...");

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
  console.log("User ID:", userId);

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
    console.log("Fetching from URL:", url);

    // Use idToken for Lambda authentication
    const lambda = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: idTokenHeader,
        "Content-Type": "application/json",
      },
    });

    console.log("Lambda response status:", lambda.status);

    if (lambda.status === 401) {
      console.log("Lambda returned 401 Unauthorized");
      return NextResponse.json(
        {
          status: "401",
          message: "Unauthorized access to messages",
        },
        { status: 401 }
      );
    }

    const rawData = await lambda.json();
    console.log("/api/chats/[chatId]/messages Raw Lambda response:", rawData);

    // Handle nested body structure like in chats API
    let data;
    if (rawData.body && typeof rawData.body === "string") {
      data = JSON.parse(rawData.body);
    } else if (rawData.body && typeof rawData.body === "object") {
      data = rawData.body;
    } else {
      data = rawData;
    }

    // console.log('Parsed response data:', data);
    data.messages.map((msg: any) => {
      console.log(
        `[MESSAGE STREAM TEST] Message ID: ${msg.type}, Created At: ${msg.content}`
      );
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

    console.log(`Total messages fetched: ${sortedMessages.length}`);
    console.log(
      "[MESSAGE STREAM TEST] 📄 Sample message structure:",
      sortedMessages[0]
    );

    // Add content field to messages if missing but message field exists
    const processedMessages = sortedMessages.map((msg: any) => {
      if (!msg.content && msg.message) {
        return { ...msg, content: msg.message };
      }
      return msg;
    });

    console.log(
      "[MESSAGE CONTENT DEBUG] After processing - content field exists:",
      !!processedMessages[0]?.content
    );

    return NextResponse.json({ messages: processedMessages }, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/chats/[chatId]/messages:", error);
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
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
