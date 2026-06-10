import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";

export default function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style,
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : styles.primary,
        (hovered || pressed) && styles.hovered,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.shine} />
      <Text
        style={[
          styles.label,
          variant === "secondary" ? styles.secondaryLabel : styles.primaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.text,
    borderColor: "rgba(255,255,255,0.78)",
    shadowColor: "#fff",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: colors.input,
    borderColor: colors.border,
  },
  hovered: {
    transform: [{ scale: 1.02 }],
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: colors.liquidHighlight,
    opacity: 0.9,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
  },
  primaryLabel: {
    color: colors.black,
  },
  secondaryLabel: {
    color: colors.text,
  },
  disabledLabel: {
    opacity: 0.9,
  },
});
