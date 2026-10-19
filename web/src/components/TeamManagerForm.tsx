import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { AdminTeam } from "../admin-types";

interface TeamManagerFormProps {
  team: AdminTeam;
  onSaved: (teamName: string) => void;
}

export default function TeamManagerForm({
  team,
  onSaved,
}: TeamManagerFormProps) {
  const [selectedId, setSelectedId] = useState(team.managerId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const candidates = team.members.filter(
    (member) =>
      member.role === "REQUESTER" || member.role === "TEAM_MANAGER",
  );

  const currentManager = team.members.find(
    (member) => member.id === team.managerId,
  );

  async function assignManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedId) {
      setError("Choisissez un membre de cette équipe.");
      return;
    }

    setBusy(true);

    try {
      await api(`/admin/teams/${team.id}/manager`, {
        method: "PUT",
        body: JSON.stringify({ userId: selectedId }),
      });

      onSaved(team.name);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de désigner le responsable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h3>{team.name}</h3>

      <p>
        Responsable actuel :{" "}
        <strong>{currentManager?.name ?? "Aucun responsable désigné"}</strong>
      </p>

      {candidates.length === 0 ? (
        <p>Aucun membre inscrit dans cette équipe.</p>
      ) : (
        <form className="request-form" onSubmit={assignManager}>
          {error && <p role="alert" className="error">{error}</p>}

          <label htmlFor={`manager-${team.id}`}>Responsable de {team.name}</label>
          <select
            id={`manager-${team.id}`}
            required
            disabled={busy}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Choisir un membre</option>

            {candidates.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} — {member.email}
              </option>
            ))}
          </select>

          {team.managerId && selectedId !== team.managerId && selectedId && (
            <p className="notice">
              Le responsable actuel sera remplacé et redeviendra demandeur.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !selectedId || selectedId === team.managerId}
          >
            {busy ? "Enregistrement…" : "Désigner le responsable"}
          </button>
        </form>
      )}
    </section>
  );
}