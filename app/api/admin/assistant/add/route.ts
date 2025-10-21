import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("POST /api/admin/assistant/add called");

  // Get authentication headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");
  const userIdHeader = req.headers.get("x-user-id");

  if (!authHeader || !idTokenHeader || !userIdHeader) {
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      id,
      title,
      src,
      template,
      description,
      introduction,
      prompt,
      temperature,
      topP,
      maxTokens,
      frequencyPenalty,
      presencePenalty,
      modelName,
      extra,
    } = body;

    const type =
      introduction.filter((f: any) => f.type === "user-input").length > 0
        ? "user-input"
        : "default";

    let requestBody: any = {
      name: name,
      prompt: prompt,
      userId: userIdHeader,
      title: title,
      src: src,
      template: template,
      temperature: temperature,
      topP: topP,
      extra: extra,
      maxTokens: maxTokens,
      frequencyPenalty: frequencyPenalty,
      presencePenalty: presencePenalty,
      modelName: modelName,
      description: description,
      introductionMessages: introduction,
      type: type,
      status: false,
    };

    if (id !== undefined) {
      requestBody["id"] = id;
    }

    const lambdaAuthHeader = idTokenHeader.startsWith("Bearer ")
      ? idTokenHeader
      : `Bearer ${idTokenHeader}`;

    const lambda = await fetch(`${process.env.REMOTE_URL}/assistant/insert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: lambdaAuthHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const response = await lambda.json();
    // console.log("/api/admin/assistant/add Lambda response:", response);

    if (response.status !== "200") {
      throw new Error("Assistant couldn't be saved.");
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST /api/admin/assistant/add:", error);
    return NextResponse.json(
      {
        error: "Failed to add assistant",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
