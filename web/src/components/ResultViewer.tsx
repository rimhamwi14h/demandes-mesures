import { useEffect, useState } from "react";
import { api } from "../api";
import { downloadResult } from "../download-result";

interface ResultFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface PublishedResult {
  id: string;
  comment: string;
  publishedAt: string;
  files: ResultFile[];
}

interface ResultViewerProps {
  requestId: string;
}

export default function ResultViewer({
  requestId,
}: ResultViewerProps) {
  const [result, setResult] = useState<PublishedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setResult(null);

    api<PublishedResult>(`/requests/${requestId}/result`)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger le résultat.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestId, attempt]);

  async function handleDownload(file: ResultFile) {
    setDownloadError("");
    setDownloading(file.id);

    try {
      await downloadResult(requestId, file.id, file.originalName);
    } catch (cause) {
      setDownloadError(
        cause instanceof Error
          ? cause.message
          : "Impossible de télécharger le fichier.",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="processing-panel">
      <h2>Résultat de la mesure</h2>

      {loading && <p role="status">Chargement du résultat…</p>}

      {error && (
        <>
          <p role="alert" className="error">{error}</p>
          <button
            className="secondary"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Réessayer
          </button>
        </>
      )}

      {!loading && !error && result && (
        <>
          <p className="muted">
            Publié le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(result.publishedAt))}
          </p>

          <p className="preserve-lines">{result.comment}</p>

          {downloadError && (
            <p role="alert" className="error">{downloadError}</p>
          )}

          <ul className="result-files">
            {result.files.map((file) => (
              <li key={file.id}>
                <div>
                  <strong>{file.originalName}</strong>
                  <p className="muted">
                    {Math.ceil(file.size / 1024)} Ko
                  </p>
                </div>

                <button
                  className="secondary"
                  disabled={downloading !== null}
                  onClick={() => handleDownload(file)}
                >
                  {downloading === file.id
                    ? "Téléchargement…"
                    : `Télécharger ${file.originalName}`}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}