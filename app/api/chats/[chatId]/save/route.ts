import { NextRequest, NextResponse } from 'next/server';
import { apiLog, apiError } from '@/lib/logging-utils';

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
    apiLog('📝 POST /api/chats/[chatId]/save called');

    const { chatId } = params;
    apiLog('📝 Chat ID:', chatId);

    // Get both access token and id token
    const authHeader = req.headers.get('Authorization');
    const idTokenHeader = req.headers.get('x-id-token');

    apiLog('Auth header:', authHeader?.substring(0, 50) + '...');
    apiLog('ID Token header:', idTokenHeader?.substring(0, 50) + '...');
    
    if (!authHeader || !idTokenHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    const userId = req.headers.get('x-user-id');
    apiLog('User ID:', userId);

    if (!userId) {
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { messages, assistantId, assistantGroupId } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({
                status: '400',
                message: 'Messages array is required',
            }, { status: 400 });
        }

        apiLog(`Saving ${messages.length} messages for chat ${chatId}`);
        
        // Find latest non-widget message (like Flutter ChatUtils.findLatestNonWidgetMessage)
        const latestMessage = messages
            .filter(msg => msg.type !== "widget")
            .reverse()
            .find(msg => msg.message || msg.content || msg.text);
        
        // Count user messages (like Flutter)
        const userMessageCount = messages.filter(message =>
            message.role === 'user' ||
            message.role === 'human' ||
            message.role === 'journal'
        ).length;
        
        apiLog(`💬 Saving ${messages.length} messages, ${userMessageCount} are user messages`);
        apiLog('📤 Received messages data:', JSON.stringify(messages, null, 2));
        
        // Filter out widget messages for JSON (like Flutter)
        const messagesJson = messages
            .filter(e => e.type !== "widget")
            .map(e => ({
                id: e.id,
                message: e.message || e.content || e.text,
                role: e.role || e.sender,
                createdAt: e.createdAt || new Date().toISOString(),
                type: e.type,
                assistantId: e.assistantId,
                ...e // Include all other properties
            }));
        
        // Prepare request data (like Flutter)
        const requestData = {
            messages: messages,
            conversationId: chatId.split("#")[0], // Split like Flutter
            userId: userId,
            localDateTime: new Date().toISOString(),
            lastMessage: latestMessage?.message || latestMessage?.content || latestMessage?.text || messages[messages.length - 1]?.message,
            assistantId: assistantId,
            assistantGroupId: assistantGroupId
        };
        
        // Prepare vector data (like Flutter)
        const vectorRequestData = {
            ...requestData,
            messages: messagesJson // Use filtered messages for vector
        };
        
        const tokenToUse = idTokenHeader
            ? (idTokenHeader.startsWith('Bearer ') ? idTokenHeader : `Bearer ${idTokenHeader}`)
            : authHeader;
        
        // Parallel requests like Flutter Future.wait
        const [conversationSave, vectorSave] = await Promise.allSettled([
            // Save conversation
            fetch(`${process.env.REMOTE_URL}/user/${userId}/conversation/save`, {
                method: 'POST',
                headers: {
                    'Authorization': tokenToUse,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            }),
            
            // Save to vector database
            fetch(`${process.env.REMOTE_URL}/user/${userId}/vector/save`, {
                method: 'POST',
                headers: {
                    'Authorization': tokenToUse,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(vectorRequestData)
            })
        ]);
        
        apiLog('💾 Conversation save result:', conversationSave.status);
        apiLog('💾 Vector save result:', vectorSave.status);

        // Check if both operations succeeded
        const conversationResult = conversationSave.status === 'fulfilled' ? await conversationSave.value.json() : null;
        const vectorResult = vectorSave.status === 'fulfilled' ? await vectorSave.value.json() : null;

        // Log any failures
        if (conversationSave.status === 'rejected') {
            apiError('Conversation save failed:', conversationSave.reason);
        }
        if (vectorSave.status === 'rejected') {
            apiError('Vector save failed:', vectorSave.reason);
        }
        
        return NextResponse.json({
            message: "Messages saved successfully",
            conversationSaved: conversationSave.status === 'fulfilled',
            vectorSaved: vectorSave.status === 'fulfilled',
            userMessageCount,
            totalMessages: messages.length,
            conversationResult,
            vectorResult
        }, { status: 200 });
        
    } catch (error: any) {
        apiError('Error in POST /api/chats/[chatId]/save:', error);
        return NextResponse.json({
            error: 'Failed to save messages',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
