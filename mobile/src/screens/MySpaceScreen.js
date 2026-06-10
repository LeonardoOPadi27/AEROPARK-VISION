import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, radii, spacing } from "../theme";

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "Sin hora limite";

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

function buildRouteHint(space) {
  if (!space?.zone) return null;

  const hints = {
    A: "Cerca del ingreso principal y el acceso peatonal.",
    B: "Ubicacion intermedia junto a los pabellones.",
    C: "Zona posterior, mas despejada en horas punta.",
  };

  return hints[space.zone.id] ?? null;
}

export default function MySpaceScreen({
  user,
  mySpace,
  onReleaseSpace,
  onOpenSpaces,
}) {
  const routeHint = buildRouteHint(mySpace);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Accion rapida"
        title="Mi espacio"
        description="Gestiona tu estacionamiento actual sin volver a buscar entre todas las zonas."
      />

      {mySpace ? (
        <>
          <GlassCard>
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
                <Text style={styles.statLabel}>Confirmacion</Text>
                <Text style={styles.statValue}>
                  {mySpace.space.confirmation_required ? "Pendiente" : "Al dia"}
                </Text>
              </View>
            </View>

            <AppButton
              label="Liberar espacio"
              onPress={() => onReleaseSpace(mySpace.space.code)}
              style={styles.primaryButton}
            />
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardTitle}>Indicacion rapida</Text>
            <Text style={styles.cardBody}>
              {routeHint ??
                "Luego podremos conectar una guia visual o enlace externo de navegacion cuando tengamos coordenadas exactas por espacio."}
            </Text>
          </GlassCard>
        </>
      ) : (
        <>
          <GlassCard>
            <Text style={styles.emptyTitle}>Aun no tienes un espacio activo</Text>
            <Text style={styles.emptyBody}>
              {user?.nombres
                ? `${user.nombres}, entra a una zona y marca tu cajon apenas te estaciones.`
                : "Entra a una zona y marca tu cajon apenas te estaciones."}
            </Text>
            <AppButton
              label="Buscar espacio"
              onPress={onOpenSpaces}
              style={styles.primaryButton}
            />
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardTitle}>Navegacion futura</Text>
            <Text style={styles.cardBody}>
              Si luego agregamos coordenadas o un plano interno, esta pestaña
              podra abrir una ruta hacia un espacio libre usando Google Maps o
              una guia del campus.
            </Text>
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
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
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
