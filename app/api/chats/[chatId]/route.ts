import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
    const { chatId } = params;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    if (!chatId) {
        return NextResponse.json({
            status: '404',
            message: 'Chat parameter is not valid.',
        }, { status: 404 });
    }
    
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }
    
    try {
        const lambda = await fetch(`${process.env.REMOTE_URL}/user/${userId}/conversation/${chatId}/get` as string, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });
        const data = await lambda.json();
        return NextResponse.json({ conversation: data }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    try {
        return NextResponse.json("Deleted successfully.", { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting chat' }, { status: 500 });
    }
}