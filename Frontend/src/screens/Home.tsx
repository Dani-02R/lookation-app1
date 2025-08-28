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
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { RootStackParamList } from "../../App";
import { useProfile } from "../hooks/useProfile";
import { signOutGoogle } from "../auth/GoogleSignIn";

const PRIMARY = "#0085FF";

const Home = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();

  const handleLogout = async () => {
    try {
      await signOutGoogle();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toCompleteProfile = () => navigation.navigate("CompleteProfile" as never);
  const toEditProfile = () => navigation.navigate("EditProfile" as never);

  const avatarSource =
    profile?.photoURL ? { uri: profile.photoURL } : require("../assets/Img-Perfil.jpeg");

  // Preferir gamertag; fallback a displayName
  const userLabel =
    (profile?.gamertag && profile.gamertag.trim().length > 0)
      ? `@${profile.gamertag}`
      : (profile?.displayName ?? "");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
          <View style={{ marginLeft: wp("2.5%") }}>
            <Text style={styles.title}>Onlookation</Text>
            {!!userLabel && (
              <Text style={styles.subtitle}>{userLabel}</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) / 3 : 0,
  },

  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: wp("14%"),
    height: wp("14%"),
    borderRadius: wp("7%"),
  },
  titleContainer: {
    marginLeft: wp("3%"),
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: { fontSize: wp("4.5%"), fontWeight: "bold", color: PRIMARY },
  subtitle: { fontSize: wp("3%"), color: "#666", marginTop: hp("0.2%") },

  editBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1%"),
    borderRadius: 10,
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: wp("3.6%") },

  // Banner
  banner: {
    marginHorizontal: wp("5%"),
    marginTop: hp("1.5%"),
    backgroundColor: "#FFF7E6",
    padding: wp("4%"),
    borderRadius: 12,
  },
  bannerTitle: { fontWeight: "700", marginBottom: hp("0.5%"), color: "#111", fontSize: wp("4%") },
  bannerDesc: { color: "#666", marginBottom: hp("1.2%"), fontSize: wp("3.3%") },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: PRIMARY,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.2%"),
    borderRadius: 10,
  },
  bannerBtnText: { color: "#fff", fontWeight: "700", fontSize: wp("3.6%") },

  // Logout
  logoutButton: {
    backgroundColor: "#FF4D4D",
    paddingVertical: hp("1.4%"),
    paddingHorizontal: wp("6%"),
    borderRadius: 12,
    alignSelf: "center",
    marginVertical: hp("1.5%"),
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: wp("4%") },

  // Mock de mapa
  mapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("2%"),
  },

  room: {
    width: wp("60%"),
    height: hp("14%"),
    backgroundColor: "#f1f1f1",
    borderRadius: wp("4%"),
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginVertical: hp("1%"),
  },
  roomLabel: { fontSize: wp("4%"), fontWeight: "600", color: "#333" },
  roomAvatar: { marginTop: hp("1%"), width: wp("10%"), height: wp("10%"), borderRadius: wp("5%") },

  hall: {
    width: wp("45%"),
    height: hp("8%"),
    backgroundColor: "#d1f7d6",
    borderRadius: wp("3%"),
    alignItems: "center",
    justifyContent: "center",
    marginVertical: hp("1%"),
  },
  hallLabel: { fontSize: wp("4%"), fontWeight: "500", color: "#333" },

  destination: {
    backgroundColor: PRIMARY,
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp("3%"),
    marginTop: hp("1%"),
  },
  destinationText: { color: "#fff", fontWeight: "bold", fontSize: wp("3.8%") },
  destinationTime: { color: "#fff", fontSize: wp("3.2%"), marginTop: hp("0.2%") },
});
