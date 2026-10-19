import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RequestForm from "./RequestForm";

describe("RequestForm", () => {
  it("submits the measurement, date and identified samples", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <RequestForm
          submitLabel="Déposer la demande"
          cancelTo="/requests"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    await user.selectOptions(
      screen.getByLabelText("Type de mesure"),
      "MICROSCOPY",
    );

    await user.type(
      screen.getByLabelText("Date souhaitée"),
      "2026-10-24",
    );

    await user.type(
      screen.getByLabelText("Référence"),
      "  SAMPLE-1  ",
    );

    await user.click(
      screen.getByRole("button", { name: "Déposer la demande" }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        measurementType: "MICROSCOPY",
        desiredDate: "2026-10-24",
        samples: [{ reference: "SAMPLE-1", description: "" }],
      });
    });
  });

  it("rejects duplicate sample references before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <RequestForm
          initialValue={{
            measurementType: "THICKNESS",
            desiredDate: "2026-10-24",
            samples: [
              { reference: "SAMPLE-1" },
              { reference: " SAMPLE-1 " },
            ],
          }}
          submitLabel="Déposer la demande"
          cancelTo="/requests"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Déposer la demande" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chaque échantillon doit avoir une référence différente.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});