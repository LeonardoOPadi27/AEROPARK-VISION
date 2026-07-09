import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";

const statusStyles = {
  free: {
    backgroundColor: "rgba(16,185,129,0.86)",
    borderColor: "rgba(110,231,183,0.75)",
  },
  occupied: {
    backgroundColor: "rgba(220,38,56,0.9)",
    borderColor: "rgba(252,165,165,0.72)",
  },
  user_occupied: {
    backgroundColor: "rgba(14,165,233,0.88)",
    borderColor: "rgba(125,211,252,0.75)",
  },
  pending: {
    backgroundColor: "rgba(234,179,8,0.88)",
    borderColor: "rgba(253,224,71,0.78)",
  },
};

const makeFallbackSlot = (index, total) => {
  const columns = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(total || 1))));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rows = Math.ceil((total || 1) / columns);

  return {
    left: 10 + column * (80 / columns),
    top: 18 + row * (64 / rows),
    width: Math.min(7.8, 68 / columns),
    height: Math.min(12, 48 / rows),
    rotate: 0,
  };
};

const ZONE_A_PHYSICAL_SLOTS = [
  { left: 18.8, top: 60.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 57, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 53.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 49.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 46.2, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 42.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 39, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 35.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 31.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 26.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 23.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 20, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 16.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 13.2, width: 5.3, height: 3.5, rotate: 0 },
  { left: 29.4, top: 66.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 62.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 59.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 55.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 52.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 48.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 45.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 41.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 38.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 32.6, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 29.4, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 26.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 23, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 19.8, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 16.6, width: 5.1, height: 3.35, rotate: 0 },
  { left: 39.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 45.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 51.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 57.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 63.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 69.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 75.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 81.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 87.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 48.5, top: 81.5, width: 8, height: 7, rotate: 49 },
  { left: 53.4, top: 79.4, width: 8, height: 7, rotate: 49 },
  { left: 58.3, top: 77.3, width: 8, height: 7, rotate: 49 },
  { left: 63.2, top: 75.2, width: 8, height: 7, rotate: 49 },
  { left: 68.1, top: 73.1, width: 8, height: 7, rotate: 49 },
  { left: 73, top: 71, width: 8, height: 7, rotate: 49 },
  { left: 77.9, top: 68.9, width: 8, height: 7, rotate: 49 },
  { left: 82.8, top: 66.8, width: 8, height: 7, rotate: 49 },
];

const ZONE_A_PHYSICAL_OFFSET_X = -4;

const createPhysicalRow = ({
  count,
  left,
  top,
  stepX,
  stepY = 0,
  width,
  height,
  rotate = 0,
  startNumber = 1,
}) =>
  Array.from({ length: count }, (_, index) => ({
    slotNumber: startNumber + index,
    left: left + index * stepX,
    top: top + index * stepY,
    width,
    height,
    rotate,
  }));

const ZONE_B_PHYSICAL_SLOTS = [
  ...createPhysicalRow({
    count: 3,
    left: 1.8,
    top: 30,
    stepX: 6.5,
    width: 5.8,
    height: 8.5,
    startNumber: 1,
  }),
  ...createPhysicalRow({
    count: 4,
    left: 28.6,
    top: 30,
    stepX: 7,
    width: 6.4,
    height: 8.2,
    startNumber: 4,
  }),
  ...createPhysicalRow({
    count: 3,
    left: 64,
    top: 30,
    stepX: 6.4,
    width: 5.7,
    height: 8.2,
    startNumber: 8,
  }),
  ...createPhysicalRow({
    count: 30,
    left: 1.8,
    top: 44,
    stepX: 3.3,
    width: 3.1,
    height: 9.4,
    startNumber: 14,
  }),
  ...createPhysicalRow({
    count: 30,
    left: 2.5,
    top: 74.8,
    stepX: 3.5,
    width: 3.35,
    height: 10.2,
    startNumber: 45,
  }),
  ...createPhysicalRow({
    count: 5,
    left: 108,
    top: 7.8,
    stepX: 0,
    stepY: 9.3,
    width: 5.1,
    height: 8,
    startNumber: 75,
  }),
].filter((slot) => ![11, 12, 13, 42, 43, 44].includes(slot.slotNumber));

const getPhysicalSlot = (zoneId, index, total) => {
  if (zoneId === "A") {
    const slot = ZONE_A_PHYSICAL_SLOTS[index] ?? makeFallbackSlot(index, total);
    return {
      ...slot,
      left: slot.left + ZONE_A_PHYSICAL_OFFSET_X,
    };
  }

  if (zoneId === "B") {
    return ZONE_B_PHYSICAL_SLOTS[index] ?? makeFallbackSlot(index, total);
  }

  return makeFallbackSlot(index, total);
};

const getSpaceStatusKey = (space) => {
  if (space.status === "user_occupied" && space.confirmation_required) {
    return "pending";
  }

  return space.status ?? "free";
};

const getPhysicalSpaces = (zone) => {
  const slots = zone.id === "A" ? ZONE_A_PHYSICAL_SLOTS : ZONE_B_PHYSICAL_SLOTS;

  if (!slots.length) return zone.spaces ?? [];

  return slots.map((slot, index) => {
    const displayCode = `${zone.id}-${String(slot.slotNumber ?? index + 1).padStart(3, "0")}`;
    const existingSpace =
      zone.spaces?.find((space) => space.display_code === displayCode) ??
      zone.spaces?.find((space) => space.code === displayCode) ??
      zone.spaces?.[index];

    return (
      existingSpace ?? {
        code: displayCode,
        display_code: displayCode,
        status: "free",
      }
    );
  });
};

export default function ParkingPhysicalMap({ zone, onSelectSpace }) {
  const isZoneB = zone?.id === "B";
  const physicalSpaces = getPhysicalSpaces(zone);
  const canvasWidth = isZoneB ? 820 : 640;
  const canvasHeight = isZoneB ? 320 : 360;
  const coordinateWidth = isZoneB ? 720 : canvasWidth;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Plano fisico</Text>
        <Text style={styles.headerHint}>
          {isZoneB ? "Desliza para ver todos los espacios" : "Toca un espacio para gestionar"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.mapCanvas, { width: canvasWidth, height: canvasHeight }]}>
          <View
            style={[
              styles.coordinateLayer,
              { width: coordinateWidth },
            ]}
          >
            <View style={styles.mapOutline} />
            {zone.id === "A" ? (
              <>
                <View style={[styles.zoneGuide, styles.zoneAGuideLeft]} />
                <View style={[styles.zoneGuide, styles.zoneAGuideMiddle]} />
                <View style={[styles.zoneGuide, styles.zoneAGuideTop]} />
                <View style={[styles.zoneAGarden]} />
                <View style={[styles.zoneAGuideBottom]} />
              </>
            ) : null}

            {physicalSpaces.map((space, index) => {
              const slot = getPhysicalSlot(zone.id, index, physicalSpaces.length);
              const statusKey = getSpaceStatusKey(space);
              const statusStyle = statusStyles[statusKey] ?? statusStyles.free;

              return (
                <Pressable
                  key={space.code ?? space.display_code}
                  onPress={() => onSelectSpace(space)}
                  style={({ pressed }) => [
                    styles.slot,
                    {
                      left: `${slot.left}%`,
                      top: `${slot.top}%`,
                      width: `${slot.width}%`,
                      height: `${slot.height}%`,
                      backgroundColor: statusStyle.backgroundColor,
                      borderColor: statusStyle.borderColor,
                      transform: [
                        { rotate: `${slot.rotate ?? 0}deg` },
                        { scale: pressed ? 1.08 : 1 },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <LegendDot color={statusStyles.free.backgroundColor} label="Libre" />
        <LegendDot color={statusStyles.occupied.backgroundColor} label="Ocupado" />
        <LegendDot color={statusStyles.user_occupied.backgroundColor} label="App" />
        <LegendDot color={statusStyles.pending.backgroundColor} label="Pendiente" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 14,
    gap: 12,
    overflow: "hidden",
  },
  headerRow: {
    gap: 3,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  headerHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingRight: 10,
  },
  mapCanvas: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#101312",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  coordinateLayer: {
    height: "100%",
  },
  mapOutline: {
    position: "absolute",
    left: "6%",
    top: "6%",
    width: "88%",
    height: "88%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.42)",
  },
  zoneGuide: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.28)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  zoneAGuideLeft: {
    left: "8%",
    top: "12%",
    width: "10%",
    height: "56%",
  },
  zoneAGuideMiddle: {
    left: "20%",
    top: "16%",
    width: "10%",
    height: "58%",
  },
  zoneAGuideTop: {
    left: "34%",
    top: "5%",
    width: "56%",
    height: "20%",
  },
  zoneAGarden: {
    position: "absolute",
    left: "40%",
    top: "33%",
    width: "42%",
    height: "25%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  zoneAGuideBottom: {
    position: "absolute",
    left: "43%",
    top: "67%",
    width: "45%",
    height: "18%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.26)",
    transform: [{ rotate: "-14deg" }],
  },
  slot: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
});
