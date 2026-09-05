import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { RequesterUser, fetchRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_requester";

interface RequesterContextType {
  currentRequester: RequesterUser | null;
  requesters: RequesterUser[];
  loading: boolean;
  error: string | null;
  selectRequester: (requester: RequesterUser) => void;
  changeRequester: () => void;
  refetchRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetchRequesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequesters();
      setRequesters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load development requesters.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchRequesters();
  }, [refetchRequesters]);

  const selectRequester = (requester: RequesterUser) => {
    setCurrentRequesterState(requester);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
    } catch {
      // Ignore storage errors
    }
  };

  const changeRequester = () => {
    setCurrentRequesterState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        loading,
        error,
        selectRequester,
        changeRequester,
        refetchRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = (): RequesterContextType => {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
};
