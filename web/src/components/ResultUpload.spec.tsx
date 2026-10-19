import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import ResultUpload from "./ResultUpload";

vi.mock("../api", () => ({
  api: vi.fn(),
}));

describe("ResultUpload", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("publishes a file and comment using FormData", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();

    vi.mocked(api).mockResolvedValue({ id: "result-1" });

    render(
      <ResultUpload
        requestId="request-1"
        onPublished={onPublished}
      />,
    );

    await user.type(
      screen.getByLabelText("Commentaire"),
      "  Résistance mesurée : 42,5 ohms.  ",
    );

    const file = new File(
      ["sample,resistance\nSAMPLE-1,42.5"],
      "mesure.csv",
      { type: "text/csv" },
    );

    await user.upload(
      screen.getByLabelText("Fichiers du résultat"),
      file,
    );

    const fileInput = screen.getByLabelText(
  "Fichiers du résultat",
) as HTMLInputElement;

expect(fileInput.files).toHaveLength(1);

const form = fileInput.closest("form");

if (!form) {
  throw new Error("Formulaire de publication introuvable.");
}

fireEvent.submit(form);

    await waitFor(() => {
      expect(api).toHaveBeenCalledOnce();
      expect(onPublished).toHaveBeenCalledOnce();
    });

    const [path, options] = vi.mocked(api).mock.calls[0];

    expect(path).toBe("/requests/request-1/result");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(FormData);

    const body = options?.body as FormData;

    expect(body.get("comment")).toBe(
      "Résistance mesurée : 42,5 ohms.",
    );
    expect(body.getAll("files")).toHaveLength(1);
    expect((body.get("files") as File).name).toBe("mesure.csv");
  });

  it("shows a server error without announcing publication", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();

    vi.mocked(api).mockRejectedValue(
      new Error("Cette demande n’est plus en cours."),
    );

    render(
      <ResultUpload
        requestId="request-1"
        onPublished={onPublished}
      />,
    );

    await user.type(
      screen.getByLabelText("Commentaire"),
      "Mesure réalisée.",
    );

    await user.upload(
      screen.getByLabelText("Fichiers du résultat"),
      new File(["résultat"], "mesure.txt", { type: "text/plain" }),
    );

    const fileInput = screen.getByLabelText(
  "Fichiers du résultat",
) as HTMLInputElement;

expect(fileInput.files).toHaveLength(1);

const form = fileInput.closest("form");

if (!form) {
  throw new Error("Formulaire de publication introuvable.");
}

fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cette demande n’est plus en cours.",
    );
    expect(onPublished).not.toHaveBeenCalled();
  });
});