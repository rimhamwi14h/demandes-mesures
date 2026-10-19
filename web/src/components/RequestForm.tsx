import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { MEASUREMENTS } from "../request-utils";
import type { RequestInput } from "../request-utils";

interface RequestFormProps {
  initialValue?: RequestInput;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (value: RequestInput) => Promise<void>;
}

interface SampleDraft {
  key: number;
  reference: string;
  description: string;
}

export default function RequestForm({
  initialValue,
  submitLabel,
  cancelTo,
  onSubmit,
}: RequestFormProps) {
  const [measurementType, setMeasurementType] = useState(
    initialValue?.measurementType ?? "",
  );
  const [desiredDate, setDesiredDate] = useState(
    initialValue?.desiredDate ?? "",
  );

  const [samples, setSamples] = useState<SampleDraft[]>(() =>
    (initialValue?.samples ?? [{ reference: "", description: "" }]).map(
      (sample, index) => ({
        key: index,
        reference: sample.reference,
        description: sample.description ?? "",
      }),
    ),
  );

  const [nextKey, setNextKey] = useState(samples.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateSample(
    key: number,
    field: "reference" | "description",
    value: string,
  ) {
    setSamples((current) =>
      current.map((sample) =>
        sample.key === key ? { ...sample, [field]: value } : sample,
      ),
    );
  }

  function addSample() {
    setSamples((current) => [
      ...current,
      { key: nextKey, reference: "", description: "" },
    ]);
    setNextKey((current) => current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedSamples = samples.map((sample) => ({
      reference: sample.reference.trim(),
      description: sample.description.trim(),
    }));

    if (!measurementType || !desiredDate) {
      setError("Choisissez une mesure et une date souhaitée.");
      return;
    }

    if (
      normalizedSamples.length === 0 ||
      normalizedSamples.some((sample) => !sample.reference)
    ) {
      setError("Chaque échantillon doit avoir une référence.");
      return;
    }

    const references = normalizedSamples.map((sample) => sample.reference);

    if (new Set(references).size !== references.length) {
      setError("Chaque échantillon doit avoir une référence différente.");
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        measurementType,
        desiredDate,
        samples: normalizedSamples,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer la demande.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="request-form">
      {error && <p role="alert" className="error">{error}</p>}

      <fieldset disabled={busy} className="form-fields">
        <legend>Informations de la demande</legend>

        <label htmlFor="measurement-type">Type de mesure</label>
        <select
          id="measurement-type"
          required
          value={measurementType}
          onChange={(event) => setMeasurementType(event.target.value)}
        >
          <option value="">Choisir une mesure</option>
          {MEASUREMENTS.map((measurement) => (
            <option key={measurement.value} value={measurement.value}>
              {measurement.label}
            </option>
          ))}
        </select>

        <label htmlFor="desired-date">Date souhaitée</label>
        <input
          id="desired-date"
          type="date"
          required
          value={desiredDate}
          onChange={(event) => setDesiredDate(event.target.value)}
        />

        <p className="muted">
          Cette date indique votre besoin. Julien décide de l’ordre de traitement.
        </p>

        <h2>Échantillons</h2>

        {samples.map((sample, index) => (
          <fieldset key={sample.key} className="sample-fields">
            <legend>Échantillon {index + 1}</legend>

            <label htmlFor={`reference-${sample.key}`}>Référence</label>
            <input
              id={`reference-${sample.key}`}
              required
              maxLength={100}
              value={sample.reference}
              onChange={(event) =>
                updateSample(sample.key, "reference", event.target.value)
              }
            />

            <label htmlFor={`description-${sample.key}`}>
              Description facultative
            </label>
            <textarea
              id={`description-${sample.key}`}
              maxLength={2000}
              rows={3}
              value={sample.description}
              onChange={(event) =>
                updateSample(sample.key, "description", event.target.value)
              }
            />

            {samples.length > 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setSamples((current) =>
                    current.filter((item) => item.key !== sample.key),
                  )
                }
              >
                Retirer l’échantillon {index + 1}
              </button>
            )}
          </fieldset>
        ))}

        <button type="button" className="secondary" onClick={addSample}>
          Ajouter un échantillon
        </button>
      </fieldset>

      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : submitLabel}
        </button>
        {!busy && <Link to={cancelTo}>Retour sans enregistrer</Link>}
      </div>
    </form>
  );
}