// RequestPasswordScreen.tsx
import axios from "axios";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { showMessage } from "react-native-flash-message";

const API_URL = "http://192.168.1.24:3000"; // Cambia si usas otra IP

// Imagen nueva (la chica con la llave)
const recoveryPasswordImage = require("../assets/recovery-password.png");

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
        message: "🎉 Contraseña actualizada",
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
      {/* Imagen arriba en absoluto */}
      <Image source={recoveryPasswordImage} style={styles.image} resizeMode="contain" />

      {/* Card blanca */}
      <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0082FA", // Igual que en RequestCodeScreen
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    position: "absolute",
    top: 190, // 👈 igual que en RequestCodeScreen
    width: 300,
    height: 270,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 210, // 👈 misma distancia que en RequestCodeScreen
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#0082FA",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
