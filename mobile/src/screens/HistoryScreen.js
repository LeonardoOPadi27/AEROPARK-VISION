import { ScrollView, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, spacing } from "../theme";

export default function HistoryScreen({ historyItems }) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Historial"
        title="Analisis recientes"
        description="Consulta rapidamente que zona fue procesada y cuanta disponibilidad se detecto en cada revision."
      />

      <View style={styles.list}>
        {historyItems.map((item) => (
          <GlassCard key={item.id}>
            <Text style={styles.cardId}>{item.id}</Text>
            <Text style={styles.cardZone}>{item.zone}</Text>
            <Text style={styles.cardMeta}>{item.processedAt}</Text>
            <Text style={styles.cardSummary}>
              {item.free} libres · {item.occupied} ocupados
            </Text>
            <Text style={styles.cardDetail}>
              {item.vehicles} vehículos · {item.precision}% precisión
            </Text>
          </GlassCard>
        ))}
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
  list: {
    gap: spacing.block,
  },
  cardId: {
    color: colors.user,
    fontSize: 13,
    fontWeight: "800",
  },
  cardZone: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  cardSummary: {
    color: colors.text,
    fontSize: 15,
    marginTop: 12,
    fontWeight: "700",
  },
  cardDetail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
});
