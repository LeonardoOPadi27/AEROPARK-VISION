import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";
import { spaceCatalog } from "../data/parkingData";

const statusStyles = {
  free: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(139,247,110,0.4)",
    dot: colors.accent,
  },
  occupied: {
    backgroundColor: colors.occupiedSoft,
    borderColor: "rgba(255,122,122,0.4)",
    dot: colors.occupied,
  },
  user_occupied: {
    backgroundColor: colors.userSoft,
    borderColor: "rgba(122,184,255,0.45)",
    dot: colors.user,
  },
};

export default function SpaceCell({ space, onPress }) {
  const statusStyle = statusStyles[space.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.cell,
        {
          backgroundColor: statusStyle.backgroundColor,
          borderColor: statusStyle.borderColor,
        },
        (hovered || pressed) && styles.cellHovered,
      ]}
    >
      <View style={styles.shine} />
      <View style={styles.topRow}>
        <View style={[styles.dot, { backgroundColor: statusStyle.dot }]} />
        <Text style={styles.statusLabel}>{spaceCatalog[space.status].label}</Text>
      </View>
      <Text style={styles.code}>{space.display_code ?? space.code}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: radii.cell,
    padding: 12,
    minHeight: 90,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cellHovered: {
    transform: [{ scale: 1.025 }],
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: colors.liquidHighlight,
    opacity: 0.6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  code: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
});
