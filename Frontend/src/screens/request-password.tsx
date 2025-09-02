// frontend/src/screens/request-password.tsx
import axios from "axios";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { toast } from "../utils/alerts";

const API_URL = "http://10.254.50.48:3000"; // Cambia si usas otra IP

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
    const c = code.trim();
    if (!c) {
      toast.warn("Atención", "Ingresa el código de verificación.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/verify-code`, { email, code: c });

      toast.success("✅ Código correcto", res.data?.message ?? "Código verificado.");
      setCodeVerified(true);
    } catch (err: any) {
      let errorMsg = "Error verificando el código";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      toast.error("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Cambiar contraseña
  const resetPassword = async () => {
    const p = newPassword;
    if (!p) {
      toast.warn("Atención", "Ingresa la nueva contraseña.");
      return;
    }
    if (p.length < 6) {
      toast.warn("Atención", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/reset-password`, { email, newPassword: p });

      toast.success("🎉 Contraseña actualizada", "Ya puedes iniciar sesión.");
      navigation.navigate("Login" as never);
    } catch (err: any) {
      let errorMsg = "Error cambiando la contraseña";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      toast.error("Error", errorMsg);
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
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={verifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verificar Código</Text>
              )}
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
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={resetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cambiar Contraseña</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const PRIMARY = "#0082FA";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY, // Igual que en RequestCodeScreen
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    position: "absolute",
    top: 190, // igual que en RequestCodeScreen
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
    marginTop: 210, // misma distancia que en RequestCodeScreen
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
    backgroundColor: PRIMARY,
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
