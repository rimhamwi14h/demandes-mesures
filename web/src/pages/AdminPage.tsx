import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { AdminCompany, AdminTeam } from "../admin-types";
import CompanyAccountForm from "../components/CompanyAccountForm";
import TeamManagerForm from "../components/TeamManagerForm";

export default function AdminPage() {
  const { user } = useAuth();

  if (user?.role !== "TECHNICIAN") {
    return (
      <section className="card">
        <h1>Accès réservé au technicien</h1>
        <Link to="/requests">Retour aux demandes</Link>
      </section>
    );
  }

  return <AdminWorkspace />;
}

function AdminWorkspace() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    Promise.all([
      api<AdminTeam[]>("/admin/teams"),
      api<AdminCompany[]>("/admin/companies"),
    ])
      .then(([loadedTeams, loadedCompanies]) => {
        if (active) {
          setTeams(loadedTeams);
          setCompanies(loadedCompanies);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger l’administration.",
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

  function companyCreated(company: AdminCompany) {
    setCompanies((current) =>
      [...current.filter((item) => item.id !== company.id), company]
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    );

    setMessage(`Le compte du contact de ${company.name} a été créé.`);
  }

  function managerSaved(teamName: string) {
    setMessage(`Le responsable de ${teamName} a été mis à jour.`);
    setAttempt((current) => current + 1);
  }

  return (
    <section>
      <p className="eyebrow">Gestion des accès</p>
      <h1>Administration</h1>

      <p>
        <Link to="/requests">Retour aux demandes</Link>
      </p>

      {message && <p role="status" className="notice">{message}</p>}
      {loading && <p role="status">Chargement de l’administration…</p>}

      {error && (
        <div className="card">
          <p role="alert" className="error">{error}</p>
          <button
            className="secondary"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="admin-sections">
          <CompanyAccountForm onCreated={companyCreated} />

          <section className="card table-container">
            <h2>Entreprises partenaires</h2>

            {companies.length === 0 ? (
              <p>Aucune entreprise enregistrée.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Entreprise</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.contact?.name ?? "Aucun contact"}</td>
                      <td>{company.contact?.email ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Responsables d’équipe</h2>
            <p>
              Chaque responsable peut consulter les demandes des membres
              de son équipe.
            </p>

            <div className="admin-team-grid">
              {teams.map((team) => (
                <TeamManagerForm
                  key={`${team.id}-${team.managerId ?? "none"}`}
                  team={team}
                  onSaved={managerSaved}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}