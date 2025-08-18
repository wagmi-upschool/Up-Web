import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    console.log('GET /api/chats called');
    console.log('Environment REMOTE_URL:', process.env.REMOTE_URL);
    
    // Get both access token and id token
    const authHeader = req.headers.get('Authorization'); // access token
    const idTokenHeader = req.headers.get('x-id-token'); // id token
    
    console.log('Auth header:', authHeader?.substring(0, 50) + '...');
    console.log('ID Token header:', idTokenHeader?.substring(0, 50) + '...');
    
    if (!authHeader) {
        console.log('No auth header found');
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    // Extract userId from token or request
    const userId = req.headers.get('x-user-id');
    console.log('User ID:', userId);
    
    if (!userId) {
        console.log('No user ID found');
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }
    
    try {
        // Use idToken if available, otherwise access token
        const tokenToUse = idTokenHeader || authHeader.replace('Bearer ', '');
        console.log('Using token:', tokenToUse.substring(0, 50) + '...');
        
        let allConversations: any[] = [];
        let nextToken: string | null = null;
        let totalFetched = 0;
        const batchSize = 50; // Fetch in batches of 50
        
        do {
            const url: string = `${process.env.REMOTE_URL}/conversation/user/${userId}/get?limit=${batchSize}${nextToken ? `&nextToken=${nextToken}` : ''}`;
            console.log(`Fetching batch from URL: ${url} (Total so far: ${totalFetched})`);
            
            const lambda = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': tokenToUse,
                    'Content-Type': 'application/json',
                },
            });
            
            console.log('Lambda response status:', lambda.status);
            
            if (lambda.status === 401) {
                console.log('Lambda returned 401 Unauthorized - using mock data for now');
                return NextResponse.json([
                    {
                        id: "1",
                        title: "UP'tan mesajlar", 
                        description: "3 yeni mesaj",
                        icon: "💬",
                        hasNewMessage: true,
                        newMessageCount: 3
                    },
                    {
                        id: "2",
                        title: "Mükemmel e-posta yazın",
                        description: "Bir e-posta için gereken tüm unsurları içer...",
                        icon: "✏️"
                    }
                ], { status: 200 });
            }
            
            const rawData = await lambda.json();
            console.log('Raw Lambda response:', rawData);
            
            // Handle nested body structure
            let data;
            if (rawData.body && typeof rawData.body === 'string') {
                data = JSON.parse(rawData.body);
            } else if (rawData.body && typeof rawData.body === 'object') {
                data = rawData.body;
            } else {
                data = rawData;
            }
            
            console.log(`Parsed response data (conversations count: ${data.conversations?.length || 0}):`, data);
            
            if (data && data.message === "Internal server error") {
                throw new Error("Failed to fetch chats");
            }
            
            // Add conversations from this batch
            if (data.conversations && Array.isArray(data.conversations)) {
                allConversations = allConversations.concat(data.conversations);
                totalFetched = allConversations.length;
            }
            
            // Check if there's more data to fetch - handle both formats
            nextToken = data.nextToken || data.lastEvaluatedKey?.idUpdatedAt || null;
            console.log(`Next token: ${nextToken}, Total fetched: ${totalFetched}`);
            
        } while (nextToken);
        
        console.log(`Total conversations fetched: ${allConversations.length}`);
        
        // Fetch assistant and group data to merge with conversations
        const assistantIds = [...new Set(allConversations.map(chat => chat.assistantId).filter(Boolean))];
        const groupIds = [...new Set(allConversations.map(chat => chat.assistantGroupId).filter(Boolean))];
        
        console.log(`Fetching ${assistantIds.length} assistants and ${groupIds.length} groups`);
        
        // Fetch assistants data in parallel
        const assistantsPromises = assistantIds.map(async (assistantId) => {
            try {
                const response = await fetch(`${process.env.REMOTE_URL}/assistant/get/${assistantId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': tokenToUse,
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                return { assistantId, data };
            } catch (error) {
                console.error(`Failed to fetch assistant ${assistantId}:`, error);
                return { assistantId, data: null };
            }
        });
        
        // Fetch groups data in parallel
        const groupsPromises = groupIds.map(async (groupId) => {
            try {
                const response = await fetch(`${process.env.REMOTE_URL}/assistant/groups/get/${groupId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': tokenToUse,
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                return { groupId, data };
            } catch (error) {
                console.error(`Failed to fetch group ${groupId}:`, error);
                return { groupId, data: null };
            }
        });
        
        const [assistantsResults, groupsResults] = await Promise.all([
            Promise.all(assistantsPromises),
            Promise.all(groupsPromises)
        ]);
        
        // Create lookup maps
        const assistantsMap = new Map();
        assistantsResults.forEach(result => {
            if (result.data) {
                assistantsMap.set(result.assistantId, result.data);
            }
        });
        
        const groupsMap = new Map();
        groupsResults.forEach(result => {
            if (result.data) {
                groupsMap.set(result.groupId, result.data);
            }
        });
        
        console.log(`Assistant data fetched: ${assistantsMap.size}, Group data fetched: ${groupsMap.size}`);
        
        // Transform Lambda data to frontend format with merged assistant and group data
        const transformedChats = allConversations.map((chat: any) => {
            const assistant = assistantsMap.get(chat.assistantId);
            const group = groupsMap.get(chat.assistantGroupId);
            
            return {
                id: chat.idUpdatedAt,
                title: chat.title || assistant?.title || 'Untitled Chat',
                description: chat.lastMessage,
                icon: chat.iconUrl || group?.iconUrl || assistant?.iconUrl,
                hasNewMessage: chat.unreadCount > 0,
                newMessageCount: chat.unreadCount || 0,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
                type: chat.type || assistant?.type || 'default',
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
                    const lowerType = (chat.type || '').toLowerCase();
                    return lowerType === 'flashcard' || 
                           lowerType === 'flashcards' ||
                           lowerType === 'boolean-tester' ||
                           lowerType === 'fill-in-blanks' ||
                           (chat.assistantId || '').includes('flashcard');
                })(),
                isRegularChat: (() => {
                    const lowerType = (chat.type || '').toLowerCase();
                    const isFlashcard = lowerType === 'flashcard' || 
                                       lowerType === 'flashcards' ||
                                       lowerType === 'boolean-tester' ||
                                       lowerType === 'fill-in-blanks' ||
                                       (chat.assistantId || '').includes('flashcard');
                    return !isFlashcard;
                })()
            };
        });
        
        return NextResponse.json(transformedChats, { status: 200 });
    } catch (error: any) {
        console.error('Error in GET /api/chats:', error);
        return NextResponse.json({ error: 'Failed to fetch chats', details: error?.message || 'Unknown error' }, { status: 500 });
    }
}