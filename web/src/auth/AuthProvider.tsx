import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  ApiError,
  SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
} from "../api";
import type { LoginResponse, User } from "../types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(
    Boolean(sessionStorage.getItem(TOKEN_KEY)),
  );

  const [initializationError, setInitializationError] =
    useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    function expireSession() {
      setUser(null);
      setLoading(false);
      setInitializationError(null);
    }

    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      expireSession,
    );

    return () => {
      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        expireSession,
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = sessionStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
          setInitializationError(null);
        }
        return;
      }

      setLoading(true);
      setInitializationError(null);

      try {
        const restoredUser = await api<User>("/auth/me");

        if (active) {
          setUser(restoredUser);
        }
      } catch (error) {
        if (!active) return;

        setUser(null);

        if (!(error instanceof ApiError && error.status === 401)) {
          setInitializationError(
            error instanceof Error
              ? error.message
              : "Impossible de restaurer la session.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [attempt]);

  async function login(email: string, password: string) {
    const result = await api<LoginResponse>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ email, password }),
    });

    sessionStorage.setItem(TOKEN_KEY, result.accessToken);
    setUser(result.user);
    setInitializationError(null);
    setLoading(false);
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setInitializationError(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializationError,
        login,
        logout,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}