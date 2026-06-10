import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import ZonePill from "../components/ZonePill";
import SpaceCell from "../components/SpaceCell";
import SpaceActionSheet from "../components/SpaceActionSheet";
import { colors, radii, spacing } from "../theme";
import { getZoneSummary } from "../utils/parking";

export default function SpacesScreen({
  zones,
  activeZoneId,
  setActiveZoneId,
  activeZone,
  currentUserId,
  onOccupySpace,
  onReleaseSpace,
}) {
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedHours, setSelectedHours] = useState(2);
  const zoneSummary = getZoneSummary(activeZone);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          eyebrow="Zonas Tecsup"
          title="Espacios"
          description="Cambia entre los tres estacionamientos y consulta los codigos disponibles antes de estacionarte."
        />

        <View style={styles.zoneTabs}>
          {zones.map((zone) => (
            <ZonePill
              key={zone.id}
              label={zone.id}
              selected={zone.id === activeZoneId}
              onPress={() => setActiveZoneId(zone.id)}
            />
          ))}
        </View>

        <GlassCard>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <Text style={styles.zoneHeading}>{activeZone.title}</Text>
              <Text style={styles.zoneMeta}>{activeZone.subtitle}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeValue}>{zoneSummary.free}</Text>
              <Text style={styles.summaryBadgeLabel}>libres</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Libres</Text>
              <Text style={styles.metricValue}>{zoneSummary.free}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Ocupados</Text>
              <Text style={styles.metricValue}>{zoneSummary.occupied}</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.grid}>
          {activeZone.spaces.map((space) => (
            <SpaceCell
              key={space.code}
              space={space}
              onPress={() => setSelectedSpace(space)}
            />
          ))}
        </View>
      </ScrollView>

      <SpaceActionSheet
        space={selectedSpace}
        visible={Boolean(selectedSpace)}
        currentUserId={currentUserId}
        selectedHours={selectedHours}
        onChangeHours={setSelectedHours}
        onClose={() => setSelectedSpace(null)}
        onOccupy={(spaceCode) => {
          onOccupySpace(spaceCode, selectedHours);
          setSelectedSpace(null);
        }}
        onRelease={(spaceCode) => {
          onReleaseSpace(spaceCode);
          setSelectedSpace(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.section,
    paddingHorizontal: spacing.screen,
    paddingBottom: 132,
    gap: spacing.block,
  },
  zoneTabs: {
    flexDirection: "row",
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  zoneHeading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  zoneMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  summaryBadge: {
    minWidth: 82,
    alignItems: "center",
    borderRadius: radii.cardInner,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.userSoft,
    borderWidth: 1,
    borderColor: "rgba(137,195,255,0.28)",
    shadowColor: "#89C3FF",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  summaryBadgeValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  summaryBadgeLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.cardInner,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
