export const getZoneSummary = (zone) => {
  const free = zone.spaces.filter((space) => space.status === "free").length;
  const occupied = zone.spaces.filter((space) => space.status !== "free").length;

  return {
    total: zone.spaces.length,
    free,
    occupied,
  };
};

export const getGlobalSummary = (zones) =>
  zones.reduce(
    (acc, zone) => {
      const summary = getZoneSummary(zone);
      return {
        free: acc.free + summary.free,
        occupied: acc.occupied + summary.occupied,
        total: acc.total + summary.total,
      };
    },
    { free: 0, occupied: 0, total: 0 },
  );
