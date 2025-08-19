import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { isUserLoggedIn } from "@/utils/profileUtil";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const BASE_URL = "https://ai-api.wagmidev.com";

  const { conversationId } = req.query;

  const session = await getServerSession(req, res, authOptions);
  const userStatus = await isUserLoggedIn(req, session || undefined);
  if (userStatus.status === false || userStatus.id === undefined) {
    return res.status(401).json({
      status: "401",
      message: "You are not logged in",
    });
  }
  const userId = userStatus.id;

  try {
    console.log("Request body:", req.body);
    console.log(
      "URL:",
      `${BASE_URL}/user/${userId}/conversation/${conversationId}/chat/stream`
    );

    const response = await fetch(
      `${BASE_URL}/user/${userId}/conversation/${conversationId}/chat/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...req.body,
          userId: userId,
          conversationId: conversationId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Response Error:", response.status, errorText);
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    // Set response headers
    res.setHeader("Content-Type", "text/plain");

    // Get the response as text
    const text = await response.text();

    // Send the response
    res.send(text);
  } catch (error: any) {
    console.error("Error in chat stream:", error);
    res.status(500).json({ error: error.message });
  }
}
