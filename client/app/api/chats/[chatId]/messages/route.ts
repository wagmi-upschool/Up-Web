import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
    const { chatId } = params;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }
    
    try {
        const lambda = await fetch(`${process.env.REMOTE_URL}/user/${userId}/conversation/${chatId}/messages?limit=${limit}` as string, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });
        const data = await lambda.json();
        const sorted_messages: any = data.messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return NextResponse.json({ messages: sorted_messages }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { chatId: string } }) {
    const { chatId } = params;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return NextResponse.json({
            status: '401',
            message: 'You are not logged in',
        }, { status: 401 });
    }
    
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
        return NextResponse.json({
            status: '401',
            message: 'User ID not found',
        }, { status: 401 });
    }
    
    try {
        const lambda = await fetch(`${process.env.REMOTE_URL}/conversation/remove?threadId=${chatId}&userId=${userId}` as string, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });
        await lambda.json();
        return NextResponse.json({ message: "Success" }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
}