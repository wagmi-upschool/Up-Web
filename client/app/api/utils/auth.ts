import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Session } from 'next-auth';

// Extend the Session type to include error
interface ExtendedSession extends Session {
    error?: string;
}

// Hook to handle authentication errors
export function useAuthError() {
    const { data: session } = useSession() as { data: ExtendedSession | null };
    const router = useRouter();

    useEffect(() => {
        if (session?.error === 'RefreshAccessTokenError') {
            signOut({ callbackUrl: `/login?error=session_expired` });
        }
    }, [session]);
}

// Wrapper for fetch that handles auth errors
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
        },
    });

    if (response.status === 401) {
        const data = await response.json();
        if (data.error === 'session expired') {
            await signOut({ callbackUrl: `/login?error=session_expired` });
            return null;
        }
    }

    return response;
} 