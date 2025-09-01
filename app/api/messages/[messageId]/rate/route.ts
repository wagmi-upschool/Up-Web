import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { messageId: string } }) {
    console.log('POST /api/messages/[messageId]/rate called with messageId:', params.messageId);
    
    try {
        const body = await req.json();
        const { rating, conversationId, isRemoveAction } = body;
        
        console.log('Rating request:', { 
            messageId: params.messageId, 
            rating, 
            conversationId,
            isRemoveAction 
        });
        
        // Get auth headers
        const authHeader = req.headers.get('Authorization');
        const idTokenHeader = req.headers.get('x-id-token');
        const userId = req.headers.get('x-user-id');
        
        console.log('Auth headers:', { 
            hasAuthHeader: !!authHeader, 
            hasIdToken: !!idTokenHeader, 
            userId: userId 
        });
        
        if (!authHeader || !userId) {
            return NextResponse.json({
                status: '401',
                message: 'Authentication required',
            }, { status: 401 });
        }

        if (!conversationId) {
            return NextResponse.json({
                status: '400',
                message: 'conversationId is required',
            }, { status: 400 });
        }

        // Use idToken if available, otherwise access token
        const tokenToUse = idTokenHeader || authHeader.replace('Bearer ', '');
        
        // Call the real backend API
        const backendUrl = `${process.env.REMOTE_URL}/user/${userId}/conversation/${conversationId}/message/${params.messageId}/changeLikeStatus`;
        console.log('Calling backend:', backendUrl);
        
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Authorization': tokenToUse,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier: params.messageId,
                userId: userId,
                likeStatus: rating,
                isRemoveAction: isRemoveAction || false
            }),
        });

        console.log('Backend response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Rating saved successfully:', data);
            return NextResponse.json({ 
                success: true, 
                message: 'Rating saved successfully',
                data 
            }, { status: 200 });
        } else {
            const errorText = await response.text();
            console.log('Backend error response body:', errorText);
            console.error('Backend error:', errorText);
            return NextResponse.json({ 
                success: false, 
                message: 'Failed to save rating',
                error: errorText 
            }, { status: response.status });
        }
        
    } catch (error: any) {
        console.error('Error in POST /api/messages/[messageId]/rate:', error);
        return NextResponse.json({ 
            error: 'Failed to save rating', 
            details: error?.message || 'Unknown error' 
        }, { status: 500 });
    }
}