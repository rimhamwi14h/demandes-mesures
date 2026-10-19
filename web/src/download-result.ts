import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from "./api";

const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function downloadResult(
  requestId: string,
  fileId: string,
  originalName: string,
): Promise<void> {
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error("Veuillez vous reconnecter.");
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/requests/${encodeURIComponent(requestId)}` +
        `/result/files/${encodeURIComponent(fileId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new Error(
      "Impossible de joindre le serveur pour télécharger le fichier.",
    );
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      sessionStorage.getItem(TOKEN_KEY) === token
    ) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    let message = "Impossible de télécharger le fichier.";

    try {
      const body: unknown = await response.json();

      if (body && typeof body === "object" && "message" in body) {
        const detail = body.message;

        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.join(" ");
        }
      }
    } catch {
      // Conserver le message par défaut si la réponse n'est pas du JSON.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = originalName;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();

    // Laisser le navigateur commencer le téléchargement avant de libérer l'URL.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}