// src/screens/Home.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Switch,
  SafeAreaView,
} from "react-native";

const Home = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("../assets/Img-Perfil.jpeg")} // avatar de usuario
          style={styles.avatar}
        />
        <View style={styles.titleContainer}>
          <Switch
            value={isEnabled}
            onValueChange={toggleSwitch}
            trackColor={{ false: "#767577", true: "#34C759" }}
            thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          />
          <Text style={styles.title}>Onlookation</Text>
        </View>
      </View>

      {/* MAPA SIMULADO */}
      <View style={styles.mapContainer}>
        {/* Bloque de salón */}
        <View style={styles.room}>
          <Text style={styles.roomLabel}>Salón 408</Text>
          <Image
            source={{ uri: "https://placekitten.com/100/100" }}
            style={styles.roomAvatar}
          />
        </View>

        {/* Pasillo */}
        <View style={styles.hall}>
          <Text style={styles.hallLabel}>Pasillo</Text>
        </View>

        {/* Destino */}
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
  titleContainer: { marginLeft: 12, flexDirection: "row", alignItems: "center" },
  title: { marginLeft: 8, fontSize: 18, fontWeight: "bold", color: "#007AFF" },

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
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  destinationText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  destinationTime: { color: "#fff", fontSize: 12 },
});
