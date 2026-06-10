import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, radii, spacing } from "../theme";

export default function ProfileScreen({
  apiBaseUrl,
  onRefresh,
  refreshing,
  user,
  onLogout,
  historyItems,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Cuenta"
        title="Perfil"
        description="Controla tu sesion, refresca la disponibilidad y revisa las ultimas actualizaciones sin salir del flujo principal."
      />

      <GlassCard>
        <Text style={styles.name}>{user?.nombres ?? "Usuario Tecsup"}</Text>
        <Text style={styles.meta}>
          {user?.correo ?? "Sin correo"} · Notificaciones activas para recordatorios
          de salida.
        </Text>
        <Text style={styles.endpoint}>API: {apiBaseUrl}</Text>
        <AppButton
          label={refreshing ? "Actualizando..." : "Actualizar disponibilidad"}
          onPress={onRefresh}
          style={styles.button}
        />
        <AppButton
          label="Cerrar sesión"
          onPress={onLogout}
          variant="secondary"
          style={styles.secondaryButton}
        />
      </GlassCard>

      <GlassCard>
        <Text style={styles.historyTitle}>Ultimas revisiones</Text>
        {historyItems?.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.historyId}>{item.id}</Text>
            <Text style={styles.historyZone}>{item.zone}</Text>
            <Text style={styles.historyMeta}>{item.processedAt}</Text>
            <Text style={styles.historySummary}>
              {item.free} libres · {item.occupied} ocupados
            </Text>
          </View>
        ))}
      </GlassCard>
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
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  endpoint: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 14,
  },
  button: {
    marginTop: 18,
  },
  secondaryButton: {
    marginTop: 12,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  historyItem: {
    marginTop: 16,
    padding: 14,
    borderRadius: radii.cardInner,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  historyId: {
    color: colors.user,
    fontSize: 12,
    fontWeight: "800",
  },
  historyZone: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  historyMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  historySummary: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
});
