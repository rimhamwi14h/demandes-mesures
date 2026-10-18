import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type {
  MeasurementRequest,
  RequestStatus,
} from "../types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  NOT_MEASURABLE: "Non mesurable",
  CANCELLED: "Annulée",
};

const MEASUREMENT_LABELS: Record<string, string> = {
  THICKNESS: "Épaisseur",
  ELECTRICAL_RESISTANCE: "Résistance électrique",
  MICROSCOPY: "Observation au microscope",
  SURFACE_ROUGHNESS: "Rugosité de surface",
  FLEXION: "Comportement en flexion",
};

export function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api<MeasurementRequest[]>("/requests")
      .then((data) => {
        if (active) setRequests(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les demandes.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Suivi des mesures</p>
          <h1>
            {user?.role === "TECHNICIAN"
              ? "Toutes les demandes"
              : user?.role === "TEAM_MANAGER"
                ? "Mes demandes et celles de mon équipe"
                : "Mes demandes"}
          </h1>
        </div>
        <button
          className="secondary"
          disabled={loading}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Actualiser
        </button>
      </div>

      {loading && <p role="status">Chargement des demandes…</p>}
      {error && <p role="alert" className="error">{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <div className="card">
          Aucune demande à afficher pour le moment.
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="card table-container">
          <table>
            <thead>
              <tr>
                <th>Mesure</th>
                <th>Demandeur</th>
                <th>Date souhaitée</th>
                <th>Échantillons</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    {MEASUREMENT_LABELS[request.measurementType]
                      ?? request.measurementType}
                  </td>
                  <td>{request.requester.name}</td>
                  <td>
                    {new Intl.DateTimeFormat("fr-FR", {
                      timeZone: "UTC",
                    }).format(new Date(request.desiredDate))}
                  </td>
                  <td>{request.samples.length}</td>
                  <td>
                    <span className={`badge ${request.status}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}