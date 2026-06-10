import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import AppButton from "../components/AppButton";
import GlassCard from "../components/GlassCard";
import SectionHeader from "../components/SectionHeader";
import { colors, radii, spacing } from "../theme";

export default function LoginScreen({ onSubmit, onRegister, submitting, error }) {
  const [mode, setMode] = useState("login");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("alexis@test.com");
  const [contrasena, setContrasena] = useState("123456");
  const isRegisterMode = mode === "register";

  const handleSubmit = () => {
    if (isRegisterMode) {
      onRegister?.({ nombres, apellidos, correo, contrasena });
      return;
    }

    onSubmit({ correo, contrasena });
  };

  return (
    <View style={styles.content}>
      <SectionHeader
        eyebrow="AeroPark Vision"
        title={isRegisterMode ? "Crear cuenta" : "Acceso mobile"}
        description={
          isRegisterMode
            ? "Registra tu cuenta para marcar el espacio que ocupas y recibir recordatorios."
            : "Inicia sesión para reportar ocupación y recibir recordatorios cuando tu tiempo estimado termine."
        }
      />

      <GlassCard style={styles.formCard}>
        <View style={styles.switchRow}>
          <AppButton
            label="Ingresar"
            onPress={() => setMode("login")}
            variant={isRegisterMode ? "secondary" : "primary"}
            style={styles.switchButton}
          />
          <AppButton
            label="Registrarme"
            onPress={() => setMode("register")}
            variant={isRegisterMode ? "primary" : "secondary"}
            style={styles.switchButton}
          />
        </View>

        {isRegisterMode ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombres</Text>
              <TextInput
                value={nombres}
                onChangeText={setNombres}
                placeholder="Tus nombres"
                placeholderTextColor={colors.textSoft}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Apellidos</Text>
              <TextInput
                value={apellidos}
                onChangeText={setApellidos}
                placeholder="Tus apellidos"
                placeholderTextColor={colors.textSoft}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
          </>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            placeholder="correo@tecsup.edu.pe"
            placeholderTextColor={colors.textSoft}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="******"
            placeholderTextColor={colors.textSoft}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          label={
            submitting
              ? isRegisterMode
                ? "Creando cuenta..."
                : "Ingresando..."
              : isRegisterMode
                ? "Crear cuenta"
                : "Iniciar sesión"
          }
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.primaryButton}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.section,
    paddingHorizontal: spacing.screen,
    justifyContent: "center",
    gap: spacing.block,
    backgroundColor: colors.background,
  },
  formCard: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  switchButton: {
    flex: 1,
    minHeight: 46,
  },
  fieldGroup: {
    gap: 8,
    marginBottom: 14,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderRadius: radii.cardInner,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
  },
  error: {
    color: colors.occupied,
    fontSize: 13,
    marginBottom: 14,
  },
  primaryButton: {
    marginTop: 4,
  },
});
