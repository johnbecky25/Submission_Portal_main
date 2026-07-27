import React, { createContext, useState, ReactNode } from "react";
import { AuthUser, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isError: boolean;
  markLoggedOut: () => void;
  markLoggedIn: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedOut, setLoggedOut] = useState(false);

  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: {
      enabled: !loggedOut,
      retry: false,
      queryKey: getGetCurrentUserQueryKey(),
    }
  });

  const markLoggedOut = () => setLoggedOut(true);
  const markLoggedIn = () => setLoggedOut(false);

  return (
    <AuthContext.Provider value={{
      user: loggedOut ? null : (user ?? null),
      isLoading: loggedOut ? false : isLoading,
      isError,
      markLoggedOut,
      markLoggedIn
    }}>
      {children}
    </AuthContext.Provider>
  );
}
