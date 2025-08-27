// src/screens/Home.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Switch,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { signOutGoogle } from "../auth/GoogleSignIn";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useProfile } from "../hooks/useProfile";

const PRIMARY = "#0085FF";

const Home = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();

  const handleLogout = async () => {
    try {
      // Cierra sesión en Firebase y limpia/revoca Google
      await signOutGoogle();

      // Reset de navegación a Login
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toCompleteProfile = () => navigation.navigate("CompleteProfile" as never);
  const toEditProfile = () => navigation.navigate("EditProfile" as never);

  const avatarSource =
    profile?.photoURL ? { uri: profile.photoURL } : require("../assets/Img-Perfil.jpeg");

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.titleContainer}>
          <Switch
            value={isEnabled}
            onValueChange={toggleSwitch}
            trackColor={{ false: "#767577", true: "#34C759" }}
            thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.title}>Onlookation</Text>
            {!!profile?.displayName && (
              <Text style={styles.subtitle}>{profile.displayName}</Text>
            )}
          </View>
        </View>

        {/* Botón Editar perfil */}
        <TouchableOpacity style={styles.editBtn} onPress={toEditProfile}>
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* BANNER: Completa tu cuenta */}
      {profile && profile.isProfileComplete === false && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Completa tu cuenta</Text>
          <Text style={styles.bannerDesc}>
            Faltan datos de tu perfil (por ejemplo, Nombre y Gamertag).
          </Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={toCompleteProfile}>
            <Text style={styles.bannerBtnText}>Completar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BOTÓN DE LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      {/* MAPA SIMULADO */}
      <View style={styles.mapContainer}>
        <View style={styles.room}>
          <Text style={styles.roomLabel}>Salón 408</Text>
          <Image source={{ uri: "https://placekitten.com/100/100" }} style={styles.roomAvatar} />
        </View>

        <View style={styles.hall}>
          <Text style={styles.hallLabel}>Pasillo</Text>
        </View>

        <View style={styles.destination}>
          <Text style={styles.destinationText}>Destino 11:11</Text>
          <Text style={styles.destinationTime}>1 min | 2 m</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  titleContainer: { marginLeft: 12, flexDirection: "row", alignItems: "center", flex: 1 },
  title: { fontSize: 18, fontWeight: "bold", color: PRIMARY },
  subtitle: { fontSize: 12, color: "#666" },

  editBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editBtnText: { color: "#fff", fontWeight: "700" },

  // Banner
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF7E6",
    padding: 14,
    borderRadius: 12,
  },
  bannerTitle: { fontWeight: "700", marginBottom: 4, color: "#111" },
  bannerDesc: { color: "#666", marginBottom: 10 },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bannerBtnText: { color: "#fff", fontWeight: "700" },

  // Logout
  logoutButton: {
    backgroundColor: "#FF4D4D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "center",
    marginVertical: 12,
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Mock de mapa
  mapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },

  room: {
    width: 160,
    height: 100,
    backgroundColor: "#f1f1f1",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  roomLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  roomAvatar: { marginTop: 8, width: 40, height: 40, borderRadius: 20 },

  hall: {
    width: 120,
    height: 60,
    backgroundColor: "#d1f7d6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hallLabel: { fontSize: 16, fontWeight: "500", color: "#333" },

  destination: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  destinationText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  destinationTime: { color: "#fff", fontSize: 12 },
});
