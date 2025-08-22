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

const emailImage = require("../assets/recovery-email.png");

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
      await axios.post("http://192.168.56.1:3000/send-code", { email });

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
      <Text style={styles.logo}>LOOKATION</Text>

      <Image source={emailImage} style={styles.image} resizeMode="contain" />

      <Text style={styles.subtitle}>
        Ingresa tu e-mail para recuperar contraseña
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
        <Text style={styles.buttonText}>ENVIAR CÓDIGO</Text>
      </TouchableOpacity>
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
    marginBottom: 30,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  subtitle: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 25,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 20,
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
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
 