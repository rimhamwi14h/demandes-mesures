import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import TeamManagerForm from "./TeamManagerForm";
import type { AdminTeam } from "../admin-types";

vi.mock("../api", () => ({
  api: vi.fn(),
}));

const team: AdminTeam = {
  id: "team-1",
  name: "Équipe 1",
  managerId: "rim",
  members: [
    {
      id: "rim",
      name: "Rim",
      email: "rim@ecole.example",
      role: "TEAM_MANAGER",
    },
    {
      id: "member-1",
      name: "Membre Test",
      email: "membre.test@ecole.example",
      role: "REQUESTER",
    },
  ],
};

describe("TeamManagerForm", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("assigns the selected member as team manager", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    vi.mocked(api).mockResolvedValue({
      id: "team-1",
      managerId: "member-1",
    });

    render(<TeamManagerForm team={team} onSaved={onSaved} />);

    await user.selectOptions(
      screen.getByLabelText("Responsable de Équipe 1"),
      "member-1",
    );

    expect(
      screen.getByText(/Le responsable actuel sera remplacé/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Désigner le responsable" }),
    );

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/admin/teams/team-1/manager", {
        method: "PUT",
        body: JSON.stringify({ userId: "member-1" }),
      });

      expect(onSaved).toHaveBeenCalledWith("Équipe 1");
    });
  });

  it("keeps the form open when the server refuses the assignment", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    vi.mocked(api).mockRejectedValue(
      new Error("Ce membre n’appartient plus à cette équipe."),
    );

    render(<TeamManagerForm team={team} onSaved={onSaved} />);

    await user.selectOptions(
      screen.getByLabelText("Responsable de Équipe 1"),
      "member-1",
    );

    await user.click(
      screen.getByRole("button", { name: "Désigner le responsable" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce membre n’appartient plus à cette équipe.",
    );

    expect(onSaved).not.toHaveBeenCalled();
  });
});