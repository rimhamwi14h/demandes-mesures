import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { MeasurementRequest } from "../types";
import { formatDate, measurementLabel } from "../request-utils";

export default function ProcessingPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const isTechnician = user?.role === "TECHNICIAN";

  useEffect(() => {
    if (!isTechnician) return;

    let active = true;

    setLoading(true);
    setLoadError("");
    setActionError("");

    api<MeasurementRequest[]>("/processing/queue")
      .then((data) => {
        if (active) {
          setRequests(data);
          setDirty(false);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger la file d’attente.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isTechnician, attempt]);

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;

    if (destination < 0 || destination >= requests.length) return;

    setRequests((current) => {
      const reordered = [...current];

      [reordered[index], reordered[destination]] = [
        reordered[destination],
        reordered[index],
      ];

      return reordered;
    });

    setDirty(true);
    setMessage("");
    setActionError("");
  }

  async function saveOrder() {
    setBusy(true);
    setActionError("");
    setMessage("");

    try {
      await api("/processing/queue/order", {
        method: "PUT",
        body: JSON.stringify({
          requestIds: requests.map((request) => request.id),
        }),
      });

      setDirty(false);
      setMessage("L’ordre de traitement a été enregistré.");
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer l’ordre.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetOrder() {
    setBusy(true);
    setActionError("");
    setMessage("");

    try {
      await api("/processing/queue/order", { method: "DELETE" });

      setMessage("Les priorités par défaut ont été rétablies.");
      setAttempt((current) => current + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Impossible de rétablir les priorités.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isTechnician) {
    return (
      <section className="card">
        <h1>Accès réservé au technicien</h1>
        <Link to="/requests">Retour aux demandes</Link>
      </section>
    );
  }

  const locked = loading || busy;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Organisation des mesures</p>
          <h1>File d’attente</h1>
        </div>

        <button
          className="secondary"
          disabled={locked || dirty}
          onClick={() => {
            setMessage("");
            setAttempt((current) => current + 1);
          }}
        >
          Actualiser
        </button>
      </div>

      <p>
        Les entreprises passent en priorité, puis les dates souhaitées.
        Vous pouvez modifier cet ordre manuellement.
      </p>

      <p>
        <Link to="/requests">Voir toutes les demandes et leurs statuts</Link>
      </p>

      {message && <p role="status" className="notice">{message}</p>}
      {loading && <p role="status">Chargement de la file d’attente…</p>}
      {loadError && <p role="alert" className="error">{loadError}</p>}
      {actionError && <p role="alert" className="error">{actionError}</p>}

      {!loading && !loadError && (
        <>
          <div className="actions">
            <button
              disabled={locked || !dirty}
              onClick={saveOrder}
            >
              Enregistrer l’ordre
            </button>

            <button
              className="secondary"
              disabled={locked}
              onClick={resetOrder}
            >
              Rétablir les priorités par défaut
            </button>
          </div>

          {dirty && (
            <div className="notice">
              <p>Vous avez modifié l’ordre sans l’enregistrer.</p>
              <button
                className="secondary"
                disabled={locked}
                onClick={() => setAttempt((current) => current + 1)}
              >
                Abandonner les changements
              </button>
            </div>
          )}

          {requests.length === 0 ? (
            <p className="card">Aucune demande en attente.</p>
          ) : (
            <div className="card table-container">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Position</th>
                    <th scope="col">Mesure</th>
                    <th scope="col">Demandeur</th>
                    <th scope="col">Origine</th>
                    <th scope="col">Date souhaitée</th>
                    <th scope="col">Ordre</th>
                    <th scope="col">Traitement</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request, index) => (
                    <tr key={request.id}>
                      <td>{index + 1}</td>
                      <td>{measurementLabel(request.measurementType)}</td>
                      <td>{request.requester.name}</td>
                      <td>
                        {request.requester.companyId
                          ? "Entreprise"
                          : "Centre"}
                      </td>
                      <td>{formatDate(request.desiredDate)}</td>

                      <td>
                        <div className="queue-buttons">
                          <button
                            className="secondary"
                            aria-label={`Monter la demande ${index + 1}`}
                            disabled={locked || index === 0}
                            onClick={() => move(index, -1)}
                          >
                            ↑
                          </button>

                          <button
                            className="secondary"
                            aria-label={`Descendre la demande ${index + 1}`}
                            disabled={locked || index === requests.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      </td>

                      <td>
                        {!dirty && !busy && (
                          <Link to={`/requests/${request.id}`}>
                            Ouvrir et traiter
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}