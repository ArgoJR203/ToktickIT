import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  AuthUser,
  login as apiLogin,
  logout as apiLogout,
  getMe as apiGetMe,
  changePassword as apiChangePassword,
} from "../api.js";

const STORAGE_TOKEN_KEY = "toktickit_token";
const STORAGE_USER_KEY = "toktickit_user";

export interface AuthContextType {
  currentUser: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialToken?: string | null;
}> = ({ children, initialUser, initialToken }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (initialToken !== undefined) return initialToken;
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (initialUser !== undefined) return initialUser;
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Validate active session token against server on initial mount
  useEffect(() => {
    let restoredToken: string | null = null;
    try {
      restoredToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch {
      restoredToken = null;
    }
    if (!restoredToken || initialUser !== undefined) return;

    let isMounted = true;
    apiGetMe(restoredToken)
      .then(({ user }) => {
        if (isMounted) {
          setCurrentUser(user);
          try {
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
          } catch {
            // Ignore storage errors
          }
        }
      })
      .catch(() => {
        // If token expired, revoked, or server rejected session, clear local storage
        if (isMounted) {
          setToken(null);
          setCurrentUser(null);
          try {
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            localStorage.removeItem(STORAGE_USER_KEY);
            localStorage.removeItem("toktickit_requester");
          } catch {
            // Ignore storage errors
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLogin({ email, password });
      setToken(result.token);
      setCurrentUser(result.user);
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, result.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const activeToken = token;
    setToken(null);
    setCurrentUser(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem("toktickit_requester");
    } catch {
      // Ignore storage errors
    }
    if (activeToken) {
      try {
        await apiLogout(activeToken);
      } catch {
        // Ignore network failure on logout
      }
    }
  }, [token]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      if (!token) {
        throw new Error("No active session found. Please sign in again.");
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiChangePassword(
          { currentPassword, newPassword, confirmPassword },
          token
        );
        const updatedUser = res.user;
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
        } catch {
          // Ignore storage errors
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to change password.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        error,
        login,
        logout,
        changePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useOptionalAuth = (): AuthContextType | null => {
  return useContext(AuthContext) ?? null;
};
