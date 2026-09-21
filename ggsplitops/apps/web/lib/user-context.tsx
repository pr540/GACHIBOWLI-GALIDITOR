"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ActiveUser {
  id: string;
  name: string;
  role: string;
  tag?: string;
}

export const DEFAULT_USER: ActiveUser = {
  id: "mem-zubair",
  name: "Zubair",
  role: "OWNER",
};

interface UserContextValue {
  currentUser: ActiveUser;
  switchUser: (user: ActiveUser) => void;
  isLoaded: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: DEFAULT_USER,
  switchUser: () => {},
  isLoaded: false,
});

const STORAGE_KEY = "ggsplitops_active_user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ActiveUser>(DEFAULT_USER);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          setCurrentUser(parsed);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER));
      }
    } catch {
      // Fallback to default
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const switchUser = (user: ActiveUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, switchUser, isLoaded }}>
      {children}
    </UserContext.Provider>
  );
}

export function useActiveUser() {
  return useContext(UserContext);
}
