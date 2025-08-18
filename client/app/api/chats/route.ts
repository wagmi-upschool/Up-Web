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
        const url = `${process.env.REMOTE_URL}/conversation/user/${userId}/get?limit=20`;
        console.log('Fetching from URL:', url);
        
        // Use idToken if available, otherwise access token
        const tokenToUse = idTokenHeader || authHeader.replace('Bearer ', '');
        console.log('Using token:', tokenToUse.substring(0, 50) + '...');
        
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
        
        const data = await lambda.json();
        console.log('Lambda response data:', data);
        
        if (data && data.message === "Internal server error") {
            throw new Error("Failed to fetch chats");
        }
        
        return NextResponse.json(data.conversations || [], { status: 200 });
    } catch (error: any) {
        console.error('Error in GET /api/chats:', error);
        return NextResponse.json({ error: 'Failed to fetch chats', details: error?.message || 'Unknown error' }, { status: 500 });
    }
}