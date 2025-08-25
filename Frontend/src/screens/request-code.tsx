// RequestCodeScreen.tsx
import axios from "axios";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { showMessage } from "react-native-flash-message";

// Tipamos la navegación
type RequestCodeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "request-code"
>;

// Imagen exportada (el chico con el celular blanco sobre azul)
const recoveryImage = require("../assets/recovery-img.png");

export default function RequestCodeScreen() {
  const [email, setEmail] = useState("");
  const navigation = useNavigation<RequestCodeScreenNavigationProp>();

  const sendCode = async () => {
    if (!email) {
      showMessage({
        message: "Error",
        description: "Debes ingresar un correo electrónico 📧",
        type: "danger",
        icon: "danger",
      });
      return;
    }

    try {
      await axios.post("http://192.168.1.24:3000/send-code", { email });

      showMessage({
        message: "Código enviado ✅",
        description: "Revisa tu correo electrónico 📧",
        type: "success",
        icon: "success",
      });

      navigation.navigate("request-password", { email });
    } catch (err) {
      let errorMsg = "No se pudo enviar el código ❌";
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      showMessage({
        message: "Error",
        description: errorMsg,
        type: "danger",
        icon: "danger",
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Imagen arriba en absoluto */}
      <Image source={recoveryImage} style={styles.image} resizeMode="contain" />

      {/* Card blanca centrada */}
      <View style={styles.card}>
        <Text style={styles.title}>¡Recupera tu contraseña!</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo electrónico para enviarte un código de recuperación.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity style={styles.button} onPress={sendCode}>
          <Text style={styles.buttonText}>Enviar código</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Recordaste tu contraseña?{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Login")}
          >
            Inicia sesión
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0082FA", // fondo azul
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    position: "absolute",
    top: 120, // 👈 ajusta la distancia desde arriba
    width: 300, // más grande
    height: 400,
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
    marginTop: 210,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
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
  footerText: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#0082FA",
    fontWeight: "bold",
  },
});
