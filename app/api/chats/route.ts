import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("GET /api/chats called");
  console.log("Environment REMOTE_URL:", process.env.REMOTE_URL);

  // Get both access token and id token
  const authHeader = req.headers.get("Authorization"); // access token
  const idTokenHeader = req.headers.get("x-id-token"); // id token

  console.log("Auth header:", authHeader?.substring(0, 50) + "...");
  console.log("ID Token header:", idTokenHeader?.substring(0, 50) + "...");

  if (!authHeader) {
    console.log("No auth header found");
    return NextResponse.json(
      {
        status: "401",
        message: "You are not logged in",
      },
      { status: 401 }
    );
  }

  // Extract userId from token or request
  const userId = req.headers.get("x-user-id");
  console.log("User ID:", userId);

  if (!userId) {
    console.log("No user ID found");
    return NextResponse.json(
      {
        status: "401",
        message: "User ID not found",
      },
      { status: 401 }
    );
  }

  try {
    const rawTokenForProxy =
      idTokenHeader || authHeader.replace("Bearer ", "");
    const lambdaAuthHeader = idTokenHeader
      ? idTokenHeader.startsWith("Bearer ")
        ? idTokenHeader
        : `Bearer ${idTokenHeader}`
      : authHeader;
    console.log(
      "Using token:",
      lambdaAuthHeader.substring(0, 50) + "..."
    );

    let allConversations: any[] = [];
    let nextToken: string | null = null;
    let totalFetched = 0;
    const batchSize = 50; // Fetch in batches of 50
    const MAX_CONVERSATIONS = 10000; // Increased limit for all conversations
    const MAX_BATCHES = 200; // Increased batch limit to fetch all
    let batchCount = 0;

    do {
      batchCount++;
      const url: string = `${process.env.REMOTE_URL}/conversation/user/${userId}/get?limit=${batchSize}&is_web=true${nextToken ? `&nextToken=${nextToken}` : ""}`;
      console.log(
        `📦 Fetching batch ${batchCount} from URL: ${url} (Total so far: ${totalFetched})`
      );

      const lambda = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: lambdaAuthHeader,
          "Content-Type": "application/json",
        },
      });

      console.log("Lambda response status:", lambda.status);

      if (lambda.status === 401) {
        console.log(
          "Lambda returned 401 Unauthorized - using mock data for now"
        );
        return NextResponse.json(
          [
            {
              id: "1",
              title: "UP'tan mesajlar",
              description: "3 yeni mesaj",
              icon: "💬",
              hasNewMessage: true,
              newMessageCount: 3,
            },
            {
              id: "2",
              title: "Mükemmel e-posta yazın",
              description: "Bir e-posta için gereken tüm unsurları içer...",
              icon: "✏️",
            },
          ],
          { status: 200 }
        );
      }

      const rawData = await lambda.json();
      //console.log("/api/chats Raw Lambda response:", rawData);

      // Handle nested body structure
      let data;
      if (rawData.body && typeof rawData.body === "string") {
        data = JSON.parse(rawData.body);
      } else if (rawData.body && typeof rawData.body === "object") {
        data = rawData.body;
      } else {
        data = rawData;
      }

      // console.log(
      //   `Parsed response data (conversations count: ${data.conversations?.length || 0}):`,
      //   data
      // );

      if (data && data.message === "Internal server error") {
        throw new Error("Failed to fetch chats");
      }

      // Add conversations from this batch
      if (data.conversations && Array.isArray(data.conversations)) {
        const previousCount = allConversations.length;
        allConversations = allConversations.concat(data.conversations);
        totalFetched = allConversations.length;

        // Check if we got new conversations
        if (batchCount > 1 && totalFetched === previousCount) {
          console.log(
            `⚠️ No new conversations received in batch ${batchCount}`
          );
          console.log(`✋ Breaking - likely reached end or duplicate data`);
          break;
        }
      }

      // Check if there's more data to fetch - handle both formats
      const newNextToken =
        data.nextToken || data.lastEvaluatedKey?.idUpdatedAt || null;
      console.log(
        `Batch ${batchCount}: Next token: ${newNextToken}, Total fetched: ${totalFetched}`
      );

      // Check for same token loop (infinite loop prevention)
      if (newNextToken && newNextToken === nextToken) {
        console.log(
          `🔄 LOOP DETECTED! Same nextToken returned: ${newNextToken}`
        );
        console.log(`💡 Backend pagination bug detected. Trying alternative pagination strategy...`);
        console.log(`📊 Current progress: ${totalFetched} conversations fetched`);

        // Try fetching with a larger batch size to get more data
        if (batchCount === 2 && totalFetched < 200) {
          console.log(`🚀 Attempting large batch fetch to bypass pagination bug...`);

          try {
            // Try progressively larger batch sizes to get all data
            const batchSizes = [200, 300, 500];
            let bestResult = allConversations;

            for (const limit of batchSizes) {
              const largeBatchUrl = `${process.env.REMOTE_URL}/conversation/user/${userId}/get?limit=${limit}&is_web=true`;
              console.log(`📦 Trying large batch fetch with limit=${limit}: ${largeBatchUrl}`);

              const largeBatchResponse = await fetch(largeBatchUrl, {
                method: "GET",
                headers: {
                  Authorization: lambdaAuthHeader,
                  "Content-Type": "application/json",
                },
              });

              if (largeBatchResponse.status === 200) {
                const largeBatchData = await largeBatchResponse.json();
                let processedData;
                if (largeBatchData.body && typeof largeBatchData.body === "string") {
                  processedData = JSON.parse(largeBatchData.body);
                } else if (largeBatchData.body && typeof largeBatchData.body === "object") {
                  processedData = largeBatchData.body;
                } else {
                  processedData = largeBatchData;
                }

                if (processedData.conversations && Array.isArray(processedData.conversations)) {
                  console.log(`✨ Batch limit=${limit} successful! Got ${processedData.conversations.length} conversations`);

                  // Keep the result with the most conversations
                  if (processedData.conversations.length > bestResult.length) {
                    bestResult = processedData.conversations;
                    console.log(`🆕 New best result: ${bestResult.length} conversations with limit=${limit}`);
                  }

                  // If we got 250+ conversations, we probably have everything
                  if (processedData.conversations.length >= 250) {
                    console.log(`🎯 Got ${processedData.conversations.length} conversations - likely complete dataset!`);
                    break;
                  }
                }
              } else {
                console.log(`❌ Batch limit=${limit} failed with status: ${largeBatchResponse.status}`);
              }

              // Small delay between requests to be nice to the backend
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Use the best result we found
            if (bestResult.length > allConversations.length) {
              allConversations = bestResult;
              totalFetched = allConversations.length;
              console.log(`🔄 Using best result: ${totalFetched} total conversations`);
            }

          } catch (error) {
            console.log(`❌ Large batch fetch failed: ${error}. Continuing with existing data.`);
          }
        }

        console.log(`✋ Breaking pagination loop after attempting workaround`);
        break;
      }

      // Check if we've reached the end (no more data)
      if (!newNextToken) {
        console.log(`✅ Reached end of data - no more nextToken`);
        break;
      }

      // Safety checks to prevent infinite fetching
      if (totalFetched >= MAX_CONVERSATIONS) {
        console.log(
          `✋ Stopping fetch - reached max conversations limit (${MAX_CONVERSATIONS})`
        );
        break;
      }
      if (batchCount >= MAX_BATCHES) {
        console.log(
          `✋ Stopping fetch - reached max batches limit (${MAX_BATCHES})`
        );
        break;
      }

      // Update token for next iteration
      nextToken = newNextToken;
    } while (
      nextToken &&
      totalFetched < MAX_CONVERSATIONS &&
      batchCount < MAX_BATCHES
    );

    console.log(
      `✅ Fetch complete: ${allConversations.length} conversations in ${batchCount} batches`
    );

    if (allConversations.length < 200 && batchCount < MAX_BATCHES) {
      console.log(`⚠️ Note: Fetched ${allConversations.length} conversations, but backend may have more.`);
      console.log(`💡 Backend pagination appears to have issues - consider investigating API pagination logic.`);
    }

    // Fetch assistant and group data to merge with conversations
    const assistantIds = Array.from(
      new Set(allConversations.map((chat) => chat.assistantId).filter(Boolean))
    );
    const groupIds = Array.from(
      new Set(
        allConversations.map((chat) => chat.assistantGroupId).filter(Boolean)
      )
    );

    console.log(
      `Fetching ${assistantIds.length} assistants and ${groupIds.length} groups`
    );
    console.log("Assistant IDs:", assistantIds);
    console.log("Group IDs:", groupIds);

    // Fetch assistants data in parallel using local admin API
    const assistantsPromises = assistantIds.map(async (assistantId) => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const response = await fetch(
          `${baseUrl}/api/admin/assistant/get?assistantId=${assistantId}`,
          {
            method: "GET",
            headers: {
              Authorization: authHeader,
              "x-id-token": idTokenHeader || rawTokenForProxy,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();

        // Check if the response is an error
        if (data.error || !response.ok) {
          console.error(`Assistant API error for ${assistantId}:`, data);
          return { assistantId, data: null };
        }

        // Extract first item if response is an array
        const assistantData = Array.isArray(data) ? data[0] : data;

        return { assistantId, data: assistantData };
      } catch (error) {
        console.error(`Failed to fetch assistant ${assistantId}:`, error);
        return { assistantId, data: null };
      }
    });

    // Fetch groups data in parallel
    const groupsPromises = groupIds.map(async (groupId) => {
      try {
        const response = await fetch(
          `${process.env.REMOTE_URL}/assistant/groups/get/${groupId}`,
          {
            method: "GET",
            headers: {
              Authorization: lambdaAuthHeader,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();

        // Check if the response is an error
        if (data.error || !response.ok) {
          console.error(`Groups API error for ${groupId}:`, data);
          return { groupId, data: null };
        }

        return { groupId, data };
      } catch (error) {
        console.error(`Failed to fetch group ${groupId}:`, error);
        return { groupId, data: null };
      }
    });

    const [assistantsResults, groupsResults] = await Promise.all([
      Promise.all(assistantsPromises),
      Promise.all(groupsPromises),
    ]);

    // Create lookup maps
    const assistantsMap = new Map();
    assistantsResults.forEach((result) => {
      // console.log(`Assistant result for ${result.assistantId}:`, result.data);
      if (result.data) {
        assistantsMap.set(result.assistantId, result.data);
      }
    });
    // console.log("Assistants map size:", assistantsMap.size);

    const groupsMap = new Map();
    groupsResults.forEach((result) => {
      if (result.data) {
        groupsMap.set(result.groupId, result.data);
      }
    });

    // console.log(
    //   `Assistant data fetched: ${assistantsMap.size}, Group data fetched: ${groupsMap.size}`
    // );

    // Define conversation types
    const excludedTypes = [
      "accountability",
      "boolean-tester",
      "flashcard",
      "fill-in-blanks",
    ];

    // Filter out specific type conversations before transformation (KEEP reflection journals now)
    const filteredConversations = allConversations.filter((chat: any) => {
      const assistant = assistantsMap.get(chat.assistantId);

      // Log filtering details for debugging
      const chatType = chat.type || "";
      const assistantType = assistant?.type || "";
      const chatTitle = chat.title || "";

      // Filter out excluded types
      const isExcludedType = excludedTypes.includes(chatType) || excludedTypes.includes(assistantType);

      // Filter out chats with undefined/empty titles and no meaningful content
      const isUndefinedChat = (
        (chatTitle === "undefined" || chatTitle === "") &&
        (chatType === "" || !chatType) &&
        (assistantType === "" || !assistantType)
      );

      if (isExcludedType) {
        console.log(`🚫 Filtering out chat: type="${chatType}", assistantType="${assistantType}", title="${chatTitle}" (excluded type)`);
        return false;
      }

      if (isUndefinedChat) {
        console.log(`🚫 Filtering out chat: type="${chatType}", assistantType="${assistantType}", title="${chatTitle}" (undefined/empty chat)`);
        return false;
      }

      console.log(`✅ Keeping chat: type="${chatType}", assistantType="${assistantType}", title="${chatTitle}"`);
      return true;
    });

    // Transform filtered Lambda data to frontend format with merged assistant and group data
    const transformedChats = filteredConversations.map((chat: any) => {
      const assistant = assistantsMap.get(chat.assistantId);
      const group = groupsMap.get(chat.assistantGroupId);

      // chat.iconUrl already contains the assistant icon URL from the conversation data
      // Special title logic for different conversation types
      const getTitle = () => {
        if (chat.type === "reflectionJournal") {
          return chat.title || "Günlük";
        }
        return chat.title || assistant?.title || "Untitled Chat";
      };

      return {
        id: chat.idUpdatedAt,
        title: getTitle(),
        description: chat.lastMessage,
        icon: assistant?.src || chat.iconUrl,
        hasNewMessage: chat.unreadCount > 0,
        newMessageCount: chat.unreadCount || 0,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        type: chat.type || assistant?.type || "default",
        assistantId: chat.assistantId,
        assistantGroupId: chat.assistantGroupId,
        isArchived: chat.isArchived || false,
        userId: chat.userId,
        lastMessage: chat.lastMessage,
        iconUrl: chat.iconUrl,
        accountabilityDetail: chat.accountabilityDetail,
        // Merged assistant data
        assistantName: assistant?.name,
        assistantDescription: assistant?.description,
        assistantPrompt: assistant?.prompt,
        assistantTemplate: assistant?.template,
        // Merged group data
        groupName: group?.name,
        groupDescription: group?.description,
        // Flashcard support methods (like in Flutter model)
        isFlashcardType: (() => {
          const lowerType = (chat.type || "").toLowerCase();
          return (
            lowerType === "flashcard" ||
            lowerType === "flashcards" ||
            lowerType === "boolean-tester" ||
            lowerType === "fill-in-blanks" ||
            (chat.assistantId || "").includes("flashcard")
          );
        })(),
        isRegularChat: (() => {
          const lowerType = (chat.type || "").toLowerCase();
          const isFlashcard =
            lowerType === "flashcard" ||
            lowerType === "flashcards" ||
            lowerType === "boolean-tester" ||
            lowerType === "fill-in-blanks" ||
            (chat.assistantId || "").includes("flashcard");
          return !isFlashcard;
        })(),
      };
    });

    console.log(`📤 Returning ${transformedChats.length} transformed chats to frontend`);
    console.log("📋 Final chat list:", transformedChats.map(chat => ({
      id: chat.id,
      title: chat.title,
      type: chat.type,
      hasNewMessage: chat.hasNewMessage
    })));

    return NextResponse.json(transformedChats, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/chats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch chats",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
