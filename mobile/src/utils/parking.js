export const getZoneSummary = (zone) => {
  const free = Number.isFinite(zone?.free_spaces) ? zone.free_spaces : null;
  const occupied = Number.isFinite(zone?.occupied_spaces)
    ? zone.occupied_spaces
    : null;

  return {
    total: zone.spaces.length,
    free,
    occupied,
    available: free !== null && occupied !== null,
  };
};

export const getGlobalSummary = (zones) =>
  zones.reduce(
    (acc, zone) => {
      const summary = getZoneSummary(zone);
      return {
        free: acc.free + (summary.free ?? 0),
        occupied: acc.occupied + (summary.occupied ?? 0),
        total: acc.total + summary.total,
        coverageComplete: acc.coverageComplete && summary.available,
      };
    },
    { free: 0, occupied: 0, total: 0, coverageComplete: true },
  );
