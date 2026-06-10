import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";

export default function ZonePill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.pill,
        selected ? styles.pillActive : null,
        (hovered || pressed) && styles.pillHovered,
      ]}
    >
      <View style={styles.shine} />
      <Text style={[styles.label, selected ? styles.labelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.tab,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ scale: 1 }],
    overflow: "hidden",
  },
  pillActive: {
    backgroundColor: colors.text,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#fff",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pillHovered: {
    transform: [{ scale: 1.025 }],
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: colors.liquidHighlight,
    opacity: 0.75,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  labelActive: {
    color: "#050608",
  },
});
