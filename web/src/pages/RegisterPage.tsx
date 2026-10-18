import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { Team, User } from "../types";

export function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api<Team[]>("/teams", { authenticated: false })
      .then((data) => {
        if (active) setTeams(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les équipes.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingTeams(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p role="status">Vérification de la session…</p>;
  }

  if (user) {
    return <Navigate to="/requests" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (new TextEncoder().encode(password).length > 72) {
      setError("Le mot de passe dépasse 72 octets.");
      return;
    }

    setBusy(true);

    try {
      await api<User>("/auth/register", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({
          name,
          email,
          password,
          teamId,
        }),
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Compte créé. Vous pouvez vous connecter.",
        },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Inscription impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card auth-card">
      <p className="eyebrow">Membres du centre</p>
      <h1>Créer un compte</h1>
      <p className="muted">
        Utilisez votre adresse de l’école et choisissez votre équipe.
        Les comptes entreprise sont créés par Julien.
      </p>

      {error && <p role="alert" className="error">{error}</p>}

      <form onSubmit={submit}>
        <label htmlFor="register-name">Nom</label>
        <input
          id="register-name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="register-email">Adresse de l’école</label>
        <input
          id="register-email"
          type="email"
          required
          maxLength={254}
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="register-password">Mot de passe</label>
        <input
          id="register-password"
          type="password"
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          aria-describedby="password-help"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <small id="password-help">Au moins 12 caractères.</small>

        <label htmlFor="register-team">Équipe</label>
        <select
          id="register-team"
          required
          disabled={loadingTeams}
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        >
          <option value="">
            {loadingTeams ? "Chargement…" : "Choisir une équipe"}
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={busy || loadingTeams || teams.length === 0}
        >
          {busy ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p><Link to="/login">Revenir à la connexion</Link></p>
    </section>
  );
}