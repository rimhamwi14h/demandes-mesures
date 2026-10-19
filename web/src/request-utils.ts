export const MEASUREMENTS = [
  { value: "THICKNESS", label: "Épaisseur" },
  { value: "ELECTRICAL_RESISTANCE", label: "Résistance électrique" },
  { value: "MICROSCOPY", label: "Observation au microscope" },
  { value: "SURFACE_ROUGHNESS", label: "Rugosité de surface" },
  { value: "FLEXION", label: "Comportement en flexion" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  NOT_MEASURABLE: "Non mesurable",
  CANCELLED: "Annulée",
};

export function measurementLabel(value: string): string {
  return MEASUREMENTS.find((item) => item.value === value)?.label ?? value;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export interface RequestInput {
  measurementType: string;
  desiredDate: string;
  samples: {
    reference: string;
    description?: string;
  }[];
}