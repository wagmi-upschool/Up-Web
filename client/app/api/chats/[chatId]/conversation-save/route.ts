import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
    console.log('[MESSAGE STREAM TEST] 🚀 POST /api/chats/[chatId]/conversation-save called (Flutter style)');
    
    const { chatId } = params;
    console.log('[MESSAGE STREAM TEST] 📝 Chat ID:', chatId);
    
    // Get auth headers
    const authHeader = req.headers.get('Authorization');
    const idTokenHeader = req.headers.get('x-id-token');
    const userId = req.headers.get('x-user-id');
    
    if (!authHeader || !idTokenHeader || !userId) {
        console.log('[MESSAGE STREAM TEST] ❌ Missing auth headers');
        return NextResponse.json({
            status: '401',
            message: 'Authentication required',
        }, { status: 401 });
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
            messages,
            conversationId 
        } = body;
        
        console.log('[MESSAGE STREAM TEST] 📝 Flutter-style save request:', {
            assistantId,
            assistantGroupId,
            type,
            messagesCount: messages?.length || 0,
            conversationId,
            title
        });

        // Prepare request body exactly like Flutter
        const flutterStyleBody = {
            assistantId,
            assistantGroupId,
            type,
            userId,
            localDateTime,
            iconUrl,
            lastMessage,
            title,
            messages: messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content, // Use content field directly
                role: msg.role,
                createdAt: msg.createdAt,
                assistantId: msg.assistantId,
                type: msg.type
            })),
            conversationId
        };

        console.log('[MESSAGE STREAM TEST] 💾 Sending to backend:', JSON.stringify(flutterStyleBody, null, 2));

        // Use idToken like Flutter does
        const tokenToUse = idTokenHeader || authHeader.replace('Bearer ', '');
        
        // Call the backend like Flutter
        const backendResponse = await fetch(`${process.env.REMOTE_URL}/user/${userId}/conversation/save`, {
            method: 'POST',
            headers: {
                'Authorization': tokenToUse,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(flutterStyleBody)
        });

        console.log('[MESSAGE STREAM TEST] 🌐 Backend response status:', backendResponse.status);

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            console.error('[MESSAGE STREAM TEST] ❌ Backend error:', errorText);
            throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`);
        }

        const result = await backendResponse.json();
        console.log('[MESSAGE STREAM TEST] ✅ Backend success:', {
            conversationId: result.conversationId,
            status: result.status
        });

        return NextResponse.json({
            status: 'success',
            message: 'Conversation saved successfully',
            conversationId: result.conversationId,
            data: result
        }, { status: 200 });
        
    } catch (error: any) {
        console.error('[MESSAGE STREAM TEST] ❌ Error in conversation-save:', error);
        return NextResponse.json({ 
            error: 'Failed to save conversation', 
            details: error?.message || 'Unknown error' 
        }, { status: 500 });
    }
}