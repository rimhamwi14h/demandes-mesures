export const TOKEN_KEY = "mesures.token";
export const SESSION_EXPIRED_EVENT = "mesures:session-expired";

const API_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = RequestInit & {
  authenticated?: boolean;
};

function extractMessage(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const message = (body as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message
        .filter((item): item is string =>
          typeof item === "string",
        )
        .join(" ");
    }
  }

  return "La requête a échoué.";
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    authenticated = true,
    ...requestOptions
  } = options;

  const headers = new Headers(requestOptions.headers);
  const token = authenticated
    ? sessionStorage.getItem(TOKEN_KEY)
    : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers,
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Vérifiez que l’API est démarrée.",
    );
  }

  if (!response.ok) {
    const body: unknown = await response
      .json()
      .catch(() => null);

    if (
      response.status === 401 &&
      token &&
      sessionStorage.getItem(TOKEN_KEY) === token
    ) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(
        new Event(SESSION_EXPIRED_EVENT),
      );
    }

    throw new ApiError(
      response.status,
      extractMessage(body),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
