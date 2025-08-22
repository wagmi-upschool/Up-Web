import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of page routes that don't require authentication
const publicPages = [
    '/login',
    '/register',
    '/forgot-password',
];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Skip middleware for static files and Next.js internals
    if (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/') ||
        pathname.includes('.') // static files like .css, .js, .ico
    ) {
        return NextResponse.next();
    }

    // Check if this is a public page
    const isPublicPage = publicPages.some(page => pathname.startsWith(page));
    
    // For now, let the client-side auth handle everything
    // This middleware just ensures clean routing
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
    ],
};