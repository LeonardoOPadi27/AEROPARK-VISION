import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import ZonePill from "../components/ZonePill";
import ParkingPhysicalMap from "../components/ParkingPhysicalMap";
import ZoneImage from "../components/ZoneImage";
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
  actionError,
  mobileSettings,
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
          <ZoneImage zoneId={activeZone.id} height={84} style={styles.zoneImage} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <Text style={styles.zoneHeading}>{activeZone.title}</Text>
              <Text style={styles.zoneMeta}>{activeZone.subtitle}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeValue}>{zoneSummary.free ?? "--"}</Text>
              <Text style={styles.summaryBadgeLabel}>
                {activeZone.occupancy_is_estimate ? "libres est." : "libres"}
              </Text>
            </View>
          </View>

          <Text style={styles.occupancyText}>
            {zoneSummary.occupied ?? "--"} ocupados
            {activeZone.unknown_spaces ? ` · ${activeZone.unknown_spaces} sin confirmar` : ""}
          </Text>
        </GlassCard>

        <ParkingPhysicalMap
          zone={activeZone}
          onSelectSpace={(space) => setSelectedSpace(space)}
        />
      </ScrollView>

      <SpaceActionSheet
        space={selectedSpace}
        visible={Boolean(selectedSpace)}
        currentUserId={currentUserId}
        selectedHours={selectedHours}
        onChangeHours={setSelectedHours}
        onClose={() => setSelectedSpace(null)}
        error={actionError}
        mobileSettings={mobileSettings}
        onOccupy={async (spaceCode) => {
          try {
            await onOccupySpace(spaceCode, selectedHours);
            setSelectedSpace(null);
          } catch { /* Keep the sheet open to show the API error. */ }
        }}
        onRelease={async (spaceCode) => {
          try {
            await onReleaseSpace(spaceCode);
            setSelectedSpace(null);
          } catch { /* Keep the sheet open to show the API error. */ }
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
  zoneImage: {
    marginBottom: 16,
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
    fontSize: 18,
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
  occupancyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 16,
  },
});
