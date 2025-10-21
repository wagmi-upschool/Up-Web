import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("GET /api/admin/assistant/get called");

  // Get authentication headers
  const authHeader = req.headers.get("Authorization");
  const idTokenHeader = req.headers.get("x-id-token");

  if (!authHeader || !idTokenHeader) {
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get("assistantId");

    const lambdaAuthHeader = idTokenHeader.startsWith("Bearer ")
      ? idTokenHeader
      : `Bearer ${idTokenHeader}`;

    const lambda = await fetch(
      `${process.env.REMOTE_URL}/assistant/get${assistantId ? `/${assistantId}` : ""}?sortByCreatedAt=desc`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: lambdaAuthHeader,
        },
      }
    );

    const response = await lambda.json();
    // console.log(" /api/admin/assistant/get Lambda response:", response);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/admin/assistant/get:", error);
    return NextResponse.json(
      {
        error: "Failed to get assistant",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
