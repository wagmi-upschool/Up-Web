import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    console.log('GET /api/admin/assistant/getGroups called');
    
    // Get authentication headers
    const authHeader = req.headers.get('Authorization');
    const idTokenHeader = req.headers.get('x-id-token');
    const userIdHeader = req.headers.get('x-user-id');
    
    if (!authHeader || !idTokenHeader || !userIdHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    try {
        const { searchParams } = new URL(req.url);
        const assistantGroupId = searchParams.get('assistantGroupId');
        
        const lambda = await fetch(`${process.env.REMOTE_URL}/assistant/groups/get${assistantGroupId ? `/${assistantGroupId}?assistantGroupId=${assistantGroupId}` : ''}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': idTokenHeader,
            },
        });
        
        const response = await lambda.json();
        console.log('Lambda response:', response);
        
        return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
        console.error('Error in GET /api/admin/assistant/getGroups:', error);
        return NextResponse.json({ error: 'Failed to get assistant groups', details: error?.message || 'Unknown error' }, { status: 500 });
    }
}