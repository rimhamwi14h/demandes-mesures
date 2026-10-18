export interface QueueEntry {
  id: string;
  queuePosition: number | null;
  desiredDate: Date;
  createdAt: Date;
  requester: {
    companyId: string | null;
  };
}

export function compareQueue(
  a: QueueEntry,
  b: QueueEntry,
): number {
  const aManual = a.queuePosition !== null;
  const bManual = b.queuePosition !== null;

  if (aManual && !bManual) return -1;
  if (!aManual && bManual) return 1;

  if (aManual && bManual) {
    const positionDifference =
      a.queuePosition! - b.queuePosition!;

    if (positionDifference !== 0) {
      return positionDifference;
    }
  }

  const aCompany = a.requester.companyId !== null;
  const bCompany = b.requester.companyId !== null;

  if (aCompany !== bCompany) {
    return aCompany ? -1 : 1;
  }

  const dateDifference =
    a.desiredDate.getTime() - b.desiredDate.getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  const creationDifference =
    a.createdAt.getTime() - b.createdAt.getTime();

  if (creationDifference !== 0) {
    return creationDifference;
  }

  return a.id.localeCompare(b.id);
}