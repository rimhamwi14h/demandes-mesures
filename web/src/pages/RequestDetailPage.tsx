import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { MeasurementRequest } from "../types";
import {
  formatDate,
  measurementLabel,
  STATUS_LABELS,
} from "../request-utils";

type RequestDetail = MeasurementRequest & {
  nonMeasurableReason?: string | null;
};

export default function RequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError("");
    setActionError("");
    setConfirmCancel(false);

    api<RequestDetail>(`/requests/${id}`)
      .then((data) => {
        if (active) setRequest(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger la demande.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  async function cancelRequest() {
    if (!request) return;

    setBusy(true);
    setActionError("");

    try {
      const updated = await api<RequestDetail>(
        `/requests/${request.id}/cancel`,
        { method: "POST" },
      );

      setRequest(updated);
      setConfirmCancel(false);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’annuler la demande.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Chargement de la demande…</p>;
  }

  if (loadError || !request) {
    return (
      <section className="card">
        <p role="alert" className="error">
          {loadError || "Demande introuvable."}
        </p>
        <button onClick={() => setAttempt((current) => current + 1)}>
          Réessayer
        </button>
        <p><Link to="/requests">Retour aux demandes</Link></p>
      </section>
    );
  }

  const canManage =
    user?.id === request.requesterId &&
    user?.role !== "TECHNICIAN" &&
    request.status === "PENDING";

  return (
    <section className="card">
      <Link to="/requests">← Retour aux demandes</Link>

      <div className="page-heading">
        <h1>{measurementLabel(request.measurementType)}</h1>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => setAttempt((current) => current + 1)}
        >
          Actualiser
        </button>
      </div>

      <dl className="request-summary">
        <dt>Demandeur</dt>
        <dd>{request.requester.name}</dd>

        <dt>Date souhaitée</dt>
        <dd>{formatDate(request.desiredDate)}</dd>

        <dt>Statut</dt>
        <dd>{STATUS_LABELS[request.status] ?? request.status}</dd>
      </dl>

      {request.status === "NOT_MEASURABLE" && (
        <div className="notice">
          <h2>Demande non mesurable</h2>
          <p className="preserve-lines">{request.nonMeasurableReason}</p>
          <p>
            Pour faire mesurer un nouvel échantillon, déposez une nouvelle demande.
          </p>
        </div>
      )}

      <h2>Échantillons</h2>
      <ul className="sample-list">
        {request.samples.map((sample) => (
          <li key={sample.id}>
            <strong>{sample.reference}</strong>
            {sample.description && (
              <p className="preserve-lines">{sample.description}</p>
            )}
          </li>
        ))}
      </ul>

      {actionError && (
        <p role="alert" className="error">{actionError}</p>
      )}

      {canManage && !confirmCancel && (
        <div className="actions">
          <Link to={`/requests/${request.id}/edit`}>Modifier la demande</Link>
          <button
            type="button"
            className="danger"
            onClick={() => setConfirmCancel(true)}
          >
            Annuler la demande
          </button>
        </div>
      )}

      {canManage && confirmCancel && (
        <div className="notice">
          <p>Confirmez-vous l’annulation de cette demande ?</p>
          <div className="actions">
            <button
              className="danger"
              disabled={busy}
              onClick={cancelRequest}
            >
              {busy ? "Annulation…" : "Confirmer l’annulation"}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setConfirmCancel(false)}
            >
              Conserver la demande
            </button>
          </div>
        </div>
      )}
    </section>
  );
}