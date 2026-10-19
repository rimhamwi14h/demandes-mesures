import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { RequestStatus } from "../types";

interface ProcessingActionsProps {
  requestId: string;
  status: RequestStatus;
  onUpdated: () => void;
}

export default function ProcessingActions({
  requestId,
  status,
  onUpdated,
}: ProcessingActionsProps) {
  const { user } = useAuth();

  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (
    user?.role !== "TECHNICIAN" ||
    (status !== "PENDING" && status !== "IN_PROGRESS")
  ) {
    return null;
  }

  async function startRequest() {
    setBusy(true);
    setError("");

    try {
      await api(`/processing/requests/${requestId}/start`, {
        method: "POST",
      });

      onUpdated();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de démarrer la mesure.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function markNotMeasurable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError("Indiquez pourquoi cette demande n’est pas mesurable.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api(`/processing/requests/${requestId}/not-measurable`, {
        method: "POST",
        body: JSON.stringify({ reason: trimmedReason }),
      });

      onUpdated();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de mettre à jour la demande.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="processing-panel">
      <h2>Traitement de la demande</h2>

      {error && <p role="alert" className="error">{error}</p>}

      {status === "PENDING" && (
        <p>
          Le démarrage empêche le demandeur de modifier ou d’annuler sa demande.
        </p>
      )}

      <div className="actions">
        {status === "PENDING" && (
          <button disabled={busy} onClick={startRequest}>
            Démarrer la mesure
          </button>
        )}

        {!showReason && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setShowReason(true)}
          >
            Déclarer non mesurable
          </button>
        )}
      </div>

      {showReason && (
        <form onSubmit={markNotMeasurable} className="request-form">
          <p>
            Cette demande restera dans l’historique avec votre explication.
            Un nouvel échantillon nécessitera une nouvelle demande.
          </p>

          <label htmlFor="non-measurable-reason">
            Raison de l’impossibilité de mesure
          </label>

          <textarea
            id="non-measurable-reason"
            required
            maxLength={2000}
            rows={4}
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <div className="actions">
            <button className="danger" type="submit" disabled={busy}>
              Confirmer « non mesurable »
            </button>

            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setShowReason(false);
                setError("");
              }}
            >
              Fermer
            </button>
          </div>
        </form>
      )}
    </section>
  );
}