import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RequestsPage } from "./pages/RequestsPage";
import type { Role } from "./types";
import RequestEditorPage from "./pages/RequestEditorPage";
import RequestDetailPage from "./pages/RequestDetailPage";
import ProcessingPage from "./pages/ProcessingPage";
import AdminPage from "./pages/AdminPage";

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Demandeur",
  TEAM_MANAGER: "Responsable d’équipe",
  COMPANY_CONTACT: "Contact entreprise",
  TECHNICIAN: "Technicien",
};

function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/requests">
          Demandes de mesure
        </Link>

        <div className="account">
          <div>
            <strong>{user?.name}</strong>
            <small>
              {user ? ROLE_LABELS[user.role] : ""}
            </small>
          </div>
          {user?.role === "TECHNICIAN" && (
          <Link to="/processing">File d’attente</Link>
      )}
          {user?.role === "TECHNICIAN" && (
          <Link to="/admin">Administration</Link>
          )}
          <button className="secondary" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/requests" element={<RequestsPage />} /><Route path="/processing" element={<ProcessingPage />} /><Route path="/admin" element={<AdminPage />} />
          <Route path="/requests/new" element={<RequestEditorPage />} /><Route path="/processing" element={<ProcessingPage />} /><Route path="/admin" element={<AdminPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} /><Route path="/processing" element={<ProcessingPage />} /><Route path="/admin" element={<AdminPage />} />
          <Route path="/requests/:id/edit" element={<RequestEditorPage />} /><Route path="/processing" element={<ProcessingPage />} /><Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/requests" replace />} />

      <Route
        path="*"
        element={
          <section className="card auth-card">
            <h1>Page introuvable</h1>
            <Link to="/requests">Revenir aux demandes</Link>
          </section>
        }
      />
    </Routes>
  );
}