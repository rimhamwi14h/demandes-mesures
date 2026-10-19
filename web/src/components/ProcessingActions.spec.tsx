import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import ProcessingActions from "./ProcessingActions";

vi.mock("../api", () => ({
  api: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ProcessingActions", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    vi.mocked(useAuth).mockReset();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "julien",
        name: "Julien",
        email: "julien@example.test",
        role: "TECHNICIAN",
        teamId: null,
        companyId: null,
      },
      loading: false,
      initializationError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retry: vi.fn(),
    });
  });

  it("starts a pending request and refreshes its detail", async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();

    vi.mocked(api).mockResolvedValue({ status: "IN_PROGRESS" });

    render(
      <ProcessingActions
        requestId="request-1"
        status="PENDING"
        onUpdated={onUpdated}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Démarrer la mesure" }),
    );

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        "/processing/requests/request-1/start",
        { method: "POST" },
      );
      expect(onUpdated).toHaveBeenCalledOnce();
    });
  });

  it("publishes the non-measurable reason", async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();

    vi.mocked(api).mockResolvedValue({ status: "NOT_MEASURABLE" });

    render(
      <ProcessingActions
        requestId="request-1"
        status="IN_PROGRESS"
        onUpdated={onUpdated}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Déclarer non mesurable" }),
    );

    await user.type(
      screen.getByLabelText("Raison de l’impossibilité de mesure"),
      "  Échantillon trop abîmé.  ",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Confirmer « non mesurable »",
      }),
    );

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        "/processing/requests/request-1/not-measurable",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Échantillon trop abîmé.",
          }),
        },
      );
      expect(onUpdated).toHaveBeenCalledOnce();
    });
  });

  it("does not offer processing actions on a completed request", () => {
    render(
      <ProcessingActions
        requestId="request-1"
        status="COMPLETED"
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});