import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AppButton from "./AppButton";
import GlassCard from "./GlassCard";
import ZonePill from "./ZonePill";
import { colors, radii, spacing } from "../theme";
import { stayOptions, spaceCatalog } from "../data/parkingData";

export default function SpaceActionSheet({
  space,
  visible,
  currentUserId,
  onClose,
  onOccupy,
  onRelease,
  selectedHours,
  onChangeHours,
}) {
  if (!space) return null;

  const isOwnedByCurrentUser =
    space.status === "user_occupied" && space.reported_user_id === currentUserId;
  const isBlockedByAnotherUser =
    space.status === "user_occupied" && !isOwnedByCurrentUser;
  const isSystemOccupied = space.status === "occupied";

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <GlassCard style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.code}>{space.display_code ?? space.code}</Text>
          <Text style={styles.state}>{spaceCatalog[space.status].label}</Text>
          <Text style={styles.description}>
            Marca manualmente que ya te estacionaste y define cuánto tiempo crees
            quedarte. Luego la app podrá recordarte confirmar la salida.
          </Text>

          {space.status === "free" ? (
            <>
              <Text style={styles.label}>Tiempo estimado</Text>
              <View style={styles.optionsRow}>
                {stayOptions.map((hours) => (
                  <ZonePill
                    key={hours}
                    label={`${hours} h`}
                    selected={selectedHours === hours}
                    onPress={() => onChangeHours(hours)}
                  />
                ))}
              </View>

              <AppButton
                label="Estoy estacionado aqui"
                onPress={() => onOccupy(space.code)}
                style={styles.primaryButton}
              />
            </>
          ) : isOwnedByCurrentUser ? (
            <AppButton
              label="Liberar espacio"
              onPress={() => onRelease(space.code)}
              style={styles.primaryButton}
            />
          ) : (
            <View style={styles.infoBlock}>
              <Text style={styles.infoText}>
                {isBlockedByAnotherUser
                  ? "Este espacio ya fue marcado por otro usuario. Solo su ocupante deberia liberarlo."
                  : isSystemOccupied
                    ? "Este espacio aparece ocupado segun la ultima revision del sistema."
                    : "Este espacio no esta disponible para cambios manuales ahora mismo."}
              </Text>
            </View>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    margin: spacing.screen,
    paddingBottom: 20,
    borderRadius: 34,
  },
  handle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 18,
  },
  code: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  state: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  label: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    marginTop: 20,
  },
  infoBlock: {
    marginTop: 20,
    borderRadius: radii.cell,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
});
