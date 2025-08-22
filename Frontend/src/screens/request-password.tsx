// RequestPasswordScreen.tsx
import axios from "axios";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { showMessage } from "react-native-flash-message";

const API_URL = "http://192.168.0.13:3000"; // Cambia si usas otra IP

export default function RequestPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params as { email: string };

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Paso 1: Verificar código
  const verifyCode = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/verify-code`, { email, code });

      showMessage({
        message: "✅ Código correcto",
        description: res.data.message,
        type: "success",
        icon: "success",
      });

      setCodeVerified(true);
    } catch (err: any) {
      let errorMsg = "Error verificando el código";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      showMessage({
        message: "Error",
        description: errorMsg,
        type: "danger",
        icon: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Cambiar contraseña
  const resetPassword = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/reset-password`, { email, newPassword });

      showMessage({
        message:    "🎉 Contraseña actualizada",
        description: "Ya puedes iniciar sesión",
        type: "success",
        icon: "success",
      });

      navigation.navigate("Login" as never);
    } catch (err: any) {
      let errorMsg = "Error cambiando la contraseña";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      showMessage({
        message: "Error",
        description: errorMsg,
        type: "danger",
        icon: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restablecer Contraseña</Text>
      <Text style={styles.subtitle}>Correo: {email}</Text>

      {!codeVerified ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={verifyCode} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? "Verificando..." : "Verificar Código"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor="#999"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? "Guardando..." : "Cambiar Contraseña"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1573E3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "white",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 25,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#0D5EC0",
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
