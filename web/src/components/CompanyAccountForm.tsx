import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { AdminCompany } from "../admin-types";

interface CompanyAccountFormProps {
  onCreated: (company: AdminCompany) => void;
}

export default function CompanyAccountForm({
  onCreated,
}: CompanyAccountFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (companyName.trim().length < 2 || contactName.trim().length < 2) {
      setError("Les noms doivent contenir au moins deux caractères.");
      return;
    }

    if (password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError("Le mot de passe doit faire au maximum 72 octets.");
      return;
    }

    setBusy(true);

    try {
      const company = await api<AdminCompany>("/admin/companies", {
        method: "POST",
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      setCompanyName("");
      setContactName("");
      setEmail("");
      setPassword("");

      onCreated(company);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer le compte.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Créer un contact d’entreprise</h2>
      <p>Chaque entreprise possède un compte de contact.</p>

      <form className="request-form" onSubmit={createAccount}>
        {error && <p role="alert" className="error">{error}</p>}

        <fieldset className="form-fields" disabled={busy}>
          <legend>Entreprise et contact</legend>

          <label htmlFor="company-name">Nom de l’entreprise</label>
          <input
            id="company-name"
            required
            minLength={2}
            maxLength={100}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />

          <label htmlFor="contact-name">Nom du contact</label>
          <input
            id="contact-name"
            required
            minLength={2}
            maxLength={100}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />

          <label htmlFor="contact-email">Email du contact</label>
          <input
            id="contact-email"
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="contact-password">Mot de passe du contact</label>
          <input
            id="contact-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </fieldset>

        <button type="submit" disabled={busy}>
          {busy ? "Création…" : "Créer le compte d’entreprise"}
        </button>
      </form>
    </section>
  );
}