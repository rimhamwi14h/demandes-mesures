import { useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const message = (
    location.state as { message?: string } | null
  )?.message;

  if (loading) {
    return <p role="status">Vérification de la session…</p>;
  }

  if (user) {
    return <Navigate to="/requests" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connexion impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card auth-card">
      <p className="eyebrow">Centre de microélectronique</p>
      <h1>Connexion</h1>
      <p className="muted">
        Retrouvez vos demandes et vos résultats.
      </p>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}

      <form onSubmit={submit}>
        <label htmlFor="login-email">Adresse email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Mot de passe</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p>
        Nouveau membre du centre ?{" "}
        <Link to="/register">Créer un compte</Link>
      </p>
    </section>
  );
}