"use client";

import { Amplify } from "aws-amplify";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import React, { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import LoginComponent from "@/components/auth/Login";
import outputs from '../../../src/amplifyconfiguration.json';

type Props = {
  children: React.ReactNode;
};

type AuthContextType = {
  user: any;
  loading: boolean;
  refreshAuth: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Configure Amplify with Gen 2 outputs
Amplify.configure(outputs, {
  ssr: true // Enable SSR support
});

const publicPaths = ["/feedback"];

function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const isPublicRoute = publicPaths.some((path) =>
    pathname?.startsWith(path),
  );

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }: any) => {
      console.log('Auth event:', payload);
      switch (payload.event) {
        case 'signInWithRedirect':
        case 'signedIn':
          console.log('User signed in');
          checkAuthState();
          break;
        case 'signedOut':
          console.log('User signed out');
          setUser(null);
          break;
        case 'tokenRefresh':
          console.log('Token refreshed');
          checkAuthState();
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  async function checkAuthState() {
    try {
      const currentUser = await getCurrentUser();
      console.log('Current user:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.log('No user found:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const contextValue = {
    user,
    loading,
    refreshAuth: checkAuthState,
    logout
  };

  if (loading && !isPublicRoute) {
    return (
      <AuthContext.Provider value={contextValue}>
        <div>Loading...</div>
      </AuthContext.Provider>
    );
  }

  console.log('AuthProvider render - User:', user, 'Loading:', loading);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {isPublicRoute ? (
        <div>{children}</div>
      ) : !user ? (
        <LoginComponent />
      ) : (
        <div>{children}</div>
      )}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
