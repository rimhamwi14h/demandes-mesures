import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const {
    user,
    loading,
    initializationError,
    retry,
    logout,
  } = useAuth();

  if (loading) {
    return <p role="status">Vérification de la session…</p>;
  }

  if (initializationError) {
    return (
      <section className="card">
        <p role="alert">{initializationError}</p>
        <div className="actions">
          <button onClick={retry}>Réessayer</button>
          <button className="secondary" onClick={logout}>
            Revenir à la connexion
          </button>
        </div>
      </section>
    );
  }

  return user
    ? <Outlet />
    : <Navigate to="/login" replace />;
}