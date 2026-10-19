import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";

interface ResultUploadProps {
  requestId: string;
  onPublished: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

export default function ResultUpload({
  requestId,
  onPublished,
}: ResultUploadProps) {
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      setError("Ajoutez un court commentaire.");
      return;
    }

    if (files.length === 0 || files.length > MAX_FILES) {
      setError("Sélectionnez entre 1 et 5 fichiers.");
      return;
    }

    if (files.some((file) => file.size === 0)) {
      setError("Les fichiers vides ne sont pas acceptés.");
      return;
    }

    if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      setError("Chaque fichier doit faire au maximum 10 Mo.");
      return;
    }

    const formData = new FormData();

    formData.append("comment", trimmedComment);

    for (const file of files) {
      formData.append("files", file);
    }

    setBusy(true);

    try {
      await api(`/requests/${requestId}/result`, {
        method: "POST",
        body: formData,
      });

      onPublished();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de publier le résultat.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="processing-panel">
      <h2>Publier le résultat</h2>

      <p>
        La publication mettra les fichiers à disposition du demandeur et
        marquera la demande comme terminée.
      </p>

      <form onSubmit={publish} className="request-form">
        {error && <p role="alert" className="error">{error}</p>}

        <label htmlFor="result-comment">Commentaire</label>
        <textarea
          id="result-comment"
          required
          maxLength={2000}
          rows={4}
          disabled={busy}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <label htmlFor="result-files">Fichiers du résultat</label>
        <input
          id="result-files"
          type="file"
          multiple
          required
          disabled={busy}
          aria-describedby="result-file-help"
          onChange={(event) =>
            setFiles(Array.from(event.target.files ?? []))
          }
        />

        <p id="result-file-help" className="muted">
          De 1 à 5 fichiers, de 10 Mo maximum chacun.
          Vous pouvez joindre des tableaux, des images ou d’autres fichiers
          de mesure.
        </p>

        {files.length > 0 && (
          <ul>
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                {file.name} — {Math.ceil(file.size / 1024)} Ko
              </li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={busy}>
          {busy ? "Publication…" : "Publier et terminer la demande"}
        </button>
      </form>
    </section>
  );
}