import { createContext, useContext } from "react";
import type { User } from "../types";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  initializationError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé dans AuthProvider.",
    );
  }

  return context;
}