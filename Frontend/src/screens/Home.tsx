// src/screens/Home.tsx
import React, { useState, useMemo } from "react";
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
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { RootStackParamList } from "../../App";
import { useProfile } from "../hooks/useProfile";
import { signOutGoogle } from "../auth/GoogleSignIn";

const PRIMARY = "#0082FA"; // Azul Lookation
const NAV_HEIGHT = 70; // alto de la barra inferior

// --- Utils ---
const getInitials = (nameLike?: string) => {
  if (!nameLike) return "U";
  const cleaned = nameLike.trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
};

type AvatarProps = {
  uri?: string | null;
  labelForInitials: string; // displayName o gamertag (para fallback)
  size?: number; // px
};

const UserAvatar: React.FC<AvatarProps> = ({
  uri,
  labelForInitials,
  size = wp("14%"),
}) => {
  const initials = useMemo(() => getInitials(labelForInitials), [labelForInitials]);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        accessible
        accessibilityLabel="Foto de perfil"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E6F0FF",
      }}
      accessible
      accessibilityLabel={`Avatar con iniciales ${initials}`}
    >
      <Text style={{ color: PRIMARY, fontWeight: "700", fontSize: size * 0.42 }}>
        {initials}
      </Text>
    </View>
  );
};

const Home = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const toggleSwitch = () => setIsEnabled((prev) => !prev);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();

  const handleLogout = async () => {
    try {
      await signOutGoogle();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toCompleteProfile = () => navigation.navigate("CompleteProfile" as never);
  const toEditProfile = () => navigation.navigate("EditProfile" as never);
  const toSettings = () => navigation.navigate("Settings" as never);
  const toChats = () => navigation.navigate("Chats" as never);
  const toFriends = () => navigation.navigate("Friends" as never);

  const userLabel =
    profile?.gamertag && profile.gamertag.trim().length > 0
      ? `@${profile.gamertag}`
      : profile?.displayName ?? "";

  const initialsSource =
    profile?.gamertag && profile.gamertag.trim().length > 0
      ? profile.gamertag
      : profile?.displayName ?? "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER (limpio, sin acciones) */}
      <View style={styles.header}>
        <UserAvatar uri={profile?.photoURL} labelForInitials={initialsSource} />

        <View style={styles.titleContainer}>
          <Switch
            value={isEnabled}
            onValueChange={toggleSwitch}
            trackColor={{ false: "#767577", true: "#34C759" }}
            thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          />
          <View style={{ marginLeft: wp("2.5%") }}>
            <Text style={styles.title}>Onlookation</Text>
            {!!userLabel && <Text style={styles.subtitle}>{userLabel}</Text>}
          </View>
        </View>
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

      {/* BOTÓN DE LOGOUT (temporal) */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      {/* MAPA SIMULADO */}
      <View style={styles.mapContainer}>
        <View style={styles.room}>
          <Text style={styles.roomLabel}>Salón 408</Text>
          <Image
            source={{ uri: "https://placekitten.com/100/100" }}
            style={styles.roomAvatar}
          />
        </View>

        <View style={styles.hall}>
          <Text style={styles.hallLabel}>Pasillo</Text>
        </View>

        <View style={styles.destination}>
          <Text style={styles.destinationText}>Destino 11:11</Text>
          <Text style={styles.destinationTime}>1 min | 2 m</Text>
        </View>
      </View>

      {/* BOTTOM NAV iOS-Like */}
      <View style={styles.bottomSpacer} />
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <BottomItem
            icon="account-multiple-outline"
            label="Amigos"
            onPress={toFriends}
          />
          <BottomItem
            icon="message-text-outline"
            label="Chats"
            onPress={toChats}
          />
          <BottomItem
            icon="pencil-outline"
            label="Editar"
            onPress={toEditProfile}
          />
          <BottomItem icon="cog-outline" label="Ajustes" onPress={toSettings} />
        </View>
      </View>
    </SafeAreaView>
  );
};

function BottomItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.bottomItem}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={PRIMARY} />
      <Text style={styles.bottomItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) / 3 : 0,
  },

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

  titleContainer: {
    marginLeft: wp("3%"),
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  title: { fontSize: wp("4.5%"), fontWeight: "bold", color: PRIMARY },
  subtitle: { fontSize: wp("3%"), color: "#666", marginTop: hp("0.2%") },

  // Banner
  banner: {
    marginHorizontal: wp("5%"),
    marginTop: hp("1.5%"),
    backgroundColor: "#FFF7E6",
    padding: wp("4%"),
    borderRadius: 12,
  },
  bannerTitle: {
    fontWeight: "700",
    marginBottom: hp("0.5%"),
    color: "#111",
    fontSize: wp("4%"),
  },
  bannerDesc: { color: "#666", marginBottom: hp("1.2%"), fontSize: wp("3.3%") },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: PRIMARY,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.2%"),
    borderRadius: 10,
  },
  bannerBtnText: { color: "#fff", fontWeight: "700", fontSize: wp("3.6%") },

  // Logout (temporal)
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
    paddingHorizontal: wp("4%"),
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
  roomAvatar: {
    marginTop: hp("1%"),
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
  },

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

  // Bottom nav
  bottomSpacer: {
    height: NAV_HEIGHT + (Platform.OS === "ios" ? 10 : 16), // espacio para que el scroll no tape contenido
  },
  bottomNavContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomNav: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: "#fff",
    height: NAV_HEIGHT,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    // Sombras estilo iOS/Android
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bottomItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottomItemText: {
    marginTop: 6,
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "700",
  },
});


