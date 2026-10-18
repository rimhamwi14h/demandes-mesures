import { describe, expect, it } from "vitest";
import { compareQueue } from "./queue-order.js";
import type { QueueEntry } from "./queue-order.js";

function entry(
  id: string,
  companyId: string | null,
  date: string,
  position: number | null = null,
): QueueEntry {
  return {
    id,
    requester: { companyId },
    desiredDate: new Date(date),
    createdAt: new Date("2026-10-18"),
    queuePosition: position,
  };
}

describe("Queue ordering", () => {
  it("places companies before internal requests", () => {
    const requests = [
      entry("internal", null, "2026-10-20"),
      entry("company", "company-1", "2026-10-30"),
    ];

    expect(
      requests.sort(compareQueue).map((item) => item.id),
    ).toEqual(["company", "internal"]);
  });

  it("uses the earliest desired date within the same category", () => {
    const requests = [
      entry("later", null, "2026-10-25"),
      entry("earlier", null, "2026-10-20"),
    ];

    expect(
      requests.sort(compareQueue).map((item) => item.id),
    ).toEqual(["earlier", "later"]);
  });

  it("respects manual order over company priority", () => {
    const requests = [
      entry("company", "company-1", "2026-10-20", 1),
      entry("internal", null, "2026-10-25", 0),
    ];

    expect(
      requests.sort(compareQueue).map((item) => item.id),
    ).toEqual(["internal", "company"]);
  });

  it("places newly unranked requests after the manual queue", () => {
    const requests = [
      entry("new-company", "company-1", "2026-10-20"),
      entry("ranked", null, "2026-10-25", 0),
    ];

    expect(
      requests.sort(compareQueue).map((item) => item.id),
    ).toEqual(["ranked", "new-company"]);
  });
});