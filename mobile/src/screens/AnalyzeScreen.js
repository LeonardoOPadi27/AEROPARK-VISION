import { StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, spacing } from "../theme";

export default function AnalyzeScreen({ activeZone }) {
  return (
    <View style={styles.content}>
      <SectionHeader
        eyebrow="Analisis"
        title="Nueva revision"
        description="Esta pantalla luego se conectara con la carga de imagen, seleccion de zona y procesamiento desde el backend."
      />

      <GlassCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>Zona actual</Text>
        <Text style={styles.heroValue}>{activeZone.title}</Text>
        <Text style={styles.heroMeta}>
          La app del usuario final deberia consumir resultados ya procesados o
          enviar imagenes solo si esa funcion queda habilitada.
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.section,
    paddingHorizontal: spacing.screen,
    paddingBottom: 132,
    gap: spacing.block,
  },
  heroCard: {
    marginTop: 8,
  },
  heroTitle: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 10,
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
});
