import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import ZoneImage from "../components/ZoneImage";
import { colors, radii, spacing } from "../theme";

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "Sin hora límite";

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return "Tiempo no disponible";
  if (diffMs <= 0) return "Tiempo vencido";

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min restantes`;
  if (!minutes) return `${hours} h restantes`;
  return `${hours} h ${minutes} min restantes`;
}

export default function MySpaceScreen({
  user,
  mySpace,
  onReleaseSpace,
  onConfirmSpace,
  actionError,
  mobileSettings,
  onOpenSpaces,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Estacionamiento"
        title="Mi espacio"
      />

      {mySpace ? (
        <>
          <GlassCard>
            <ZoneImage zoneId={mySpace.zone.id} height={108} style={styles.zoneImage} />
            <Text style={styles.statusLabel}>Espacio activo</Text>
            <Text style={styles.spaceCode}>{mySpace.space.display_code ?? mySpace.space.code}</Text>
            <Text style={styles.spaceMeta}>
              {mySpace.zone.title} · {formatRemainingTime(mySpace.space.expires_at)}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Tiempo estimado</Text>
                <Text style={styles.statValue}>
                  {mySpace.space.estimated_hours
                    ? `${mySpace.space.estimated_hours} h`
                    : "No definido"}
                </Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Confirmación</Text>
                <Text style={styles.statValue}>
                  {mySpace.space.confirmation_required ? "Pendiente" : "Al día"}
                </Text>
              </View>
            </View>

            <AppButton
              label="Confirmar que sigo estacionado"
              onPress={() => onConfirmSpace(mySpace.space.code)}
              disabled={!mySpace.space.confirmation_required}
              style={styles.primaryButton}
            />
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            <AppButton
              label="Liberar espacio"
              onPress={() => onReleaseSpace(mySpace.space.code).catch(() => {})}
              disabled={!mobileSettings?.manual_release_enabled}
              variant="secondary"
              style={styles.secondaryButton}
            />
          </GlassCard>

        </>
      ) : (
        <>
          <GlassCard>
            <Text style={styles.emptyTitle}>Aún no tienes un espacio activo</Text>
            <Text style={styles.emptyBody}>
              {user?.nombres
                ? `${user.nombres}, entra a una zona y marca el espacio que ocupas.`
                : "Entra a una zona y marca el espacio que ocupas."}
            </Text>
            <AppButton
              label="Buscar espacio"
              onPress={onOpenSpaces}
              style={styles.primaryButton}
            />
          </GlassCard>

        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.section,
    paddingHorizontal: spacing.screen,
    paddingBottom: 132,
    gap: spacing.block,
  },
  zoneImage: {
    marginBottom: 16,
  },
  statusLabel: {
    color: colors.user,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  spaceCode: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    marginTop: 10,
  },
  spaceMeta: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
  },
  statBlock: {
    flex: 1,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.cardInner,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statLabel: {
    color: colors.textSoft,
    fontSize: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 20,
  },
  secondaryButton: { marginTop: 10 },
  actionError: { color: colors.occupied, marginTop: 12, fontSize: 13 },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
});
