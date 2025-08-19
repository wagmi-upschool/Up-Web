import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
    console.log('POST /api/chats/[chatId]/send called');
    
    const { chatId } = params;
    console.log('Chat ID:', chatId);
    
    // Get both access token and id token
    const authHeader = req.headers.get('Authorization');
    const idTokenHeader = req.headers.get('x-id-token');
    
    console.log('Auth header:', authHeader?.substring(0, 50) + '...');
    console.log('ID Token header:', idTokenHeader?.substring(0, 50) + '...');
    
    if (!authHeader || !idTokenHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    const userId = req.headers.get('x-user-id');
    console.log('User ID:', userId);
    
    if (!userId) {
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const { message, assistantId } = body;
        
        if (!message || !assistantId) {
            return NextResponse.json({
                status: '400',
                message: 'Message and assistantId are required',
            }, { status: 400 });
        }
        
        console.log('Sending message:', { message, assistantId, chatId });
        
        // Prepare the request data (like Flutter)
        const requestData = {
            "query": message,
            "assistantId": assistantId,
            "conversationId": chatId,
            "stage": process.env.REMOTE_URL?.includes("myenv") ? "myenv" : "upwagmitec"
        };
        
        const apiPath = `/user/${userId}/conversation/${chatId}/chat/stream`;
        const url = `${process.env.STREAM_URL}${apiPath}`;
        
        console.log('Streaming from URL:', url);
        console.log('Request data:', requestData);
        
        // Use idToken for Lambda authentication
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': idTokenHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Stream response status:', response.status);
        
        if (!response.ok) {
            console.error('Stream API error:', response.status, response.statusText);
            return NextResponse.json({
                status: response.status.toString(),
                message: `Stream API error: ${response.statusText}`,
            }, { status: response.status });
        }
        
        // For streaming responses, we need to handle the stream
        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Create a readable stream to pipe the response
            const stream = new ReadableStream({
                start(controller) {
                    function pump(): Promise<void> {
                        return reader.read().then(({ done, value }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            
                            // Decode and forward the chunk
                            const chunk = decoder.decode(value, { stream: true });
                            controller.enqueue(new TextEncoder().encode(chunk));
                            return pump();
                        });
                    }
                    return pump();
                }
            });
            
            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }
        
        // Fallback for non-streaming response
        const data = await response.text();
        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
    } catch (error: any) {
        console.error('Error in POST /api/chats/[chatId]/send:', error);
        return NextResponse.json({ 
            error: 'Failed to send message', 
            details: error?.message || 'Unknown error' 
        }, { status: 500 });
    }
}