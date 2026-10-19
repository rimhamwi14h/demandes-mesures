import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import RequestForm from "../components/RequestForm";
import type { MeasurementRequest } from "../types";
import type { RequestInput } from "../request-utils";

export default function RequestEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<MeasurementRequest | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setRequest(null);
    setError("");
    setLoading(Boolean(id));

    if (id) {
      api<MeasurementRequest>(`/requests/${id}`)
        .then((data) => {
          if (active) setRequest(data);
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Impossible de charger la demande.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p role="status">Chargement de la demande…</p>;
  }

  if (error) {
    return (
      <section className="card">
        <p role="alert" className="error">{error}</p>
        <Link to="/requests">Retour aux demandes</Link>
      </section>
    );
  }

  if (user?.role === "TECHNICIAN") {
    return (
      <section className="card">
        <h1>Dépôt réservé aux demandeurs</h1>
        <Link to="/requests">Retour aux demandes</Link>
      </section>
    );
  }

  if (id && !request) {
    return <p role="alert">Demande introuvable.</p>;
  }

  if (
    request &&
    (request.requesterId !== user?.id || request.status !== "PENDING")
  ) {
    return (
      <section className="card">
        <h1>Modification indisponible</h1>
        <p>
          Vous pouvez modifier uniquement vos propres demandes encore en attente.
        </p>
        <Link to={`/requests/${request.id}`}>Retour à la demande</Link>
      </section>
    );
  }

  const initialValue: RequestInput | undefined = request
    ? {
        measurementType: request.measurementType,
        desiredDate: request.desiredDate.slice(0, 10),
        samples: request.samples.map((sample) => ({
          reference: sample.reference,
          description: sample.description ?? "",
        })),
      }
    : undefined;

  async function save(value: RequestInput) {
    const saved = await api<MeasurementRequest>(
      id ? `/requests/${id}` : "/requests",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(value),
      },
    );

    navigate(`/requests/${saved.id}`, { replace: true });
  }

  return (
    <section className="card">
      <h1>{id ? "Modifier la demande" : "Nouvelle demande"}</h1>
      <p>Une demande correspond à un seul type de mesure.</p>

      <RequestForm
        key={id ?? "new"}
        initialValue={initialValue}
        submitLabel={
          id ? "Enregistrer les modifications" : "Déposer la demande"
        }
        cancelTo={id ? `/requests/${id}` : "/requests"}
        onSubmit={save}
      />
    </section>
  );
}