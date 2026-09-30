"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ActiveUser {
  id: string;
  name: string;
  role: string;
  tag?: string;
  email?: string;
  avatarUrl?: string;
}

export function getAvatarSeed(user: Pick<ActiveUser, "id" | "name" | "email">): string {
  return user.email?.trim() || user.name.trim() || user.id;
}

export function getAvatarUrl(user: Pick<ActiveUser, "id" | "name" | "email">): string {
  const seed = encodeURIComponent(getAvatarSeed(user));
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&radius=50&backgroundColor=b6d7ff,ffdbac,f2c5d7,bbf7d0,c7d2fe&fontSize=42`;
}

export const DEFAULT_USER: ActiveUser = {
  id: "mem-zubair",
  name: "Zubair",
  role: "OWNER",
  email: "zubair@splitops.in",
  avatarUrl: getAvatarUrl({ id: "mem-zubair", name: "Zubair", email: "zubair@splitops.in" }),
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
          setCurrentUser({
            ...DEFAULT_USER,
            ...parsed,
            avatarUrl: parsed.avatarUrl ?? getAvatarUrl({
              id: parsed.id ?? DEFAULT_USER.id,
              name: parsed.name,
              email: parsed.email ?? DEFAULT_USER.email ?? parsed.name,
            }),
          });
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
