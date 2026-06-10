import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, radii, spacing } from "../theme";
import { getGlobalSummary, getZoneSummary } from "../utils/parking";

export default function HomeScreen({ zones, setActiveZoneId, setActiveTab }) {
  const summary = getGlobalSummary(zones);
  const bestZone =
    [...zones]
      .sort((a, b) => getZoneSummary(b).free - getZoneSummary(a).free)
      .at(0) ?? null;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Tecsup"
        title="Espacios disponibles"
        description="Consulta las tres zonas del estacionamiento y revisa rapidamente donde aun quedan espacios libres."
      />

      <GlassCard>
        <Text style={styles.heroLabel}>Mejor opcion ahora</Text>
        <Text style={styles.heroValue} numberOfLines={2}>
          {bestZone?.title ?? "Sin zonas"}
        </Text>
        <Text style={styles.heroMeta}>
          {bestZone
            ? `${getZoneSummary(bestZone).free} libres disponibles en esta zona.`
            : `${summary.occupied} ocupados de ${summary.total} espacios totales.`}
        </Text>
        {bestZone ? (
          <AppButton
            label="Ir directo a esta zona"
            onPress={() => {
              setActiveZoneId(bestZone.id);
              setActiveTab("spaces");
            }}
            style={styles.heroAction}
          />
        ) : null}
      </GlassCard>

      <View style={styles.zoneList}>
        {zones.map((zone) => {
          const zoneSummary = getZoneSummary(zone);

          return (
            <GlassCard key={zone.id}>
              <View style={styles.zoneRow}>
                <View style={styles.zoneCopy}>
                  <Text style={styles.zoneTitle}>{zone.title}</Text>
                  <Text style={styles.zoneSubtitle}>
                    {zone.subtitle} · actualizado {zone.updatedAt}
                  </Text>
                </View>
                <Text style={styles.zoneFree}>{zoneSummary.free}</Text>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Libres</Text>
                  <Text style={styles.metricValue}>{zoneSummary.free}</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Ocupados</Text>
                  <Text style={styles.metricValue}>{zoneSummary.occupied}</Text>
                </View>
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.openLink,
                    (hovered || pressed) && styles.openLinkHovered,
                  ]}
                  onPress={() => {
                    setActiveZoneId(zone.id);
                    setActiveTab("spaces");
                  }}
                >
                  <Text style={styles.openLinkText}>Ver zona</Text>
                </Pressable>
              </View>
            </GlassCard>
          );
        })}
      </View>
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
  heroLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroValue: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    marginTop: 10,
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
  heroAction: {
    marginTop: 14,
    alignSelf: "flex-start",
  },
  zoneList: {
    gap: spacing.block,
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneCopy: {
    flex: 1,
    paddingRight: 14,
  },
  zoneTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  zoneSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  zoneFree: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: "900",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 18,
  },
  metricBlock: {
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.cardInner,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  openLink: {
    marginLeft: "auto",
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.userSoft,
    borderWidth: 1,
    borderColor: "rgba(137,195,255,0.26)",
  },
  openLinkHovered: {
    transform: [{ scale: 1.03 }],
  },
  openLinkText: {
    color: colors.user,
    fontSize: 14,
    fontWeight: "800",
  },
});
