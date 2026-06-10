import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radii } from "../theme";

export default function GlassCard({ children, style }) {
  return (
    <View style={[styles.shell, style]}>
      <View style={styles.edgeGlow} />
      <View style={styles.innerHighlight} />
      <View style={styles.bottomShade} />
      <View style={styles.topGlow} />
      <BlurView intensity={25} tint="dark" style={styles.blur}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelStrong,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  edgeGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    opacity: 0.22,
  },
  innerHighlight: {
    position: "absolute",
    top: 1,
    left: 12,
    right: 12,
    height: 26,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colors.liquidHighlightSoft,
    opacity: 0.22,
  },
  bottomShade: {
    position: "absolute",
    right: 8,
    bottom: 8,
    left: 8,
    height: 22,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    backgroundColor: colors.liquidShadow,
    opacity: 0.22,
    shadowColor: "#000",
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: colors.liquidHighlight,
    zIndex: 2,
  },
  blur: {
    padding: 18,
  },
});
