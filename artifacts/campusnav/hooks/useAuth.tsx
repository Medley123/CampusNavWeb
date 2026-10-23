import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  email: string;
  name: string;
  username: string;
  picture?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isGuest: boolean;
  loading: boolean;
  signIn: (user: AuthUser) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "campusnav-auth-user";
const GUEST_STORAGE_KEY = "campusnav-guest-session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AUTH_STORAGE_KEY),
      AsyncStorage.getItem(GUEST_STORAGE_KEY),
    ])
      .then(([storedUser, storedGuest]) => {
        if (storedUser) setUser(JSON.parse(storedUser) as AuthUser);
        else if (storedGuest === "true") setIsGuest(true);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (nextUser: AuthUser) => {
    setUser(nextUser);
    setIsGuest(false);
    await Promise.all([
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser)),
      AsyncStorage.removeItem(GUEST_STORAGE_KEY),
    ]);
  };

  const continueAsGuest = async () => {
    setUser(null);
    setIsGuest(true);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEY),
      AsyncStorage.setItem(GUEST_STORAGE_KEY, "true"),
    ]);
  };

  const signOut = async () => {
    setUser(null);
    setIsGuest(false);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEY),
      AsyncStorage.removeItem(GUEST_STORAGE_KEY),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signIn, continueAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
