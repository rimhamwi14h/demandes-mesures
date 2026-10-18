import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { TOKEN_KEY } from "../api";
import { LoginPage } from "./LoginPage";

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/requests"
            element={<h1>Espace des demandes</h1>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("connects the user and opens their workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: "test-token",
            user: {
              id: "julien",
              name: "Julien",
              email: "julien@example.test",
              role: "TECHNICIAN",
              teamId: null,
              companyId: null,
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByLabelText("Adresse email"),
      "julien@example.test",
    );
    await user.type(
      screen.getByLabelText("Mot de passe"),
      "JulienDemo2026!",
    );
    await user.click(
      screen.getByRole("button", { name: "Se connecter" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Espace des demandes",
      }),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe("test-token");
  });

  it("shows an authentication error without creating a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Email ou mot de passe incorrect.",
          }),
          { status: 401 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(
      screen.getByLabelText("Adresse email"),
      "julien@example.test",
    );
    await user.type(
      screen.getByLabelText("Mot de passe"),
      "wrong-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Se connecter" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email ou mot de passe incorrect.",
    );

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});