import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useProfile } from '../hooks/useProfile';
import { signOutGoogle } from '../auth/GoogleSignIn';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PRIMARY = '#0082FA';

type RowProps = {
  icon: string;
  label: string;
  onPress?: () => void;
  color?: string;
  size?: number;
};
const Row: React.FC<RowProps> = ({ icon, label, onPress, color = PRIMARY, size = 20 }) => (
  <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
    <Icon name={icon} size={size} color={color} style={styles.rowIcon} />
    <Text style={styles.rowText}>{label}</Text>
  </TouchableOpacity>
);

// ===== Avatar (foto o iniciales) =====
const getInitials = (nameLike?: string) => {
  if (!nameLike) return 'U';
  const cleaned = nameLike.trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
};

const UserAvatar: React.FC<{ uri?: string | null; nameForInitials?: string; size?: number }> = ({
  uri,
  nameForInitials,
  size = 112,
}) => {
  const initials = useMemo(() => getInitials(nameForInitials), [nameForInitials]);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E6F0FF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: PRIMARY, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();

  const fullName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    '';

  const handleEdit = () => navigation.navigate('EditProfile' as never);

  const handleLogout = async () => {
    try {
      await signOutGoogle(); // no navegues manual; App.tsx hará el switch
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => {/* TODO: delete account */} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <UserAvatar uri={profile?.photoURL} nameForInitials={fullName || profile?.gamertag || ''} />

          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.9}>
            <Text style={styles.editBtnText}>Editar perfil ✏️</Text>
          </TouchableOpacity>

          <Text style={styles.name} numberOfLines={2}>
            {fullName}
          </Text>
        </View>

        <View style={styles.page}>
          {/* Comunidad */}
          <Text style={styles.sectionTitle}>Comunidad</Text>
          <Row icon="bullhorn" label="Actualizaciones" onPress={() => {}} />
          <Row icon="bug-outline" label="Reportar bugs" onPress={() => {}} />
          <View style={styles.separator} />

          {/* Privacidad */}
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <Row icon="history" label="Actividad reciente" onPress={() => {}} />
          <Row icon="logout-variant" label="Cerrar sesión en otros dispositivos" onPress={() => {}} />
          <View style={styles.separator} />

          {/* Soporte */}
          <Text style={styles.sectionTitle}>Soporte</Text>
          <Row icon="email-outline" label="Contacto" onPress={() => {}} />
          <Text style={styles.mail}>Lookationservice@gmail.com</Text>
          <View style={styles.separator} />

          {/* Políticas */}
          <Text style={styles.sectionTitle}>Políticas</Text>
          <Row icon="file-document-outline" label="Términos de uso" onPress={() => {}} />
          <Row icon="shield-lock-outline" label="Políticas de privacidad" onPress={() => {}} />

          {/* Botones finales */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogout}>
            <Text style={styles.primaryBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#0F6BDA' }]} onPress={handleDelete}>
            <Text style={styles.primaryBtnText}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  header: {
    backgroundColor: PRIMARY,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },

  editBtn: {
    marginTop: 12,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  editBtnText: {
    color: PRIMARY,
    fontWeight: '700',
  },

  name: {
    marginTop: 12,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  page: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowIcon: {
    width: 28,
    textAlign: 'center',
  },
  rowText: {
    marginLeft: 8,
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },

  separator: {
    height: 1,
    backgroundColor: PRIMARY,
    opacity: 0.35,
    marginVertical: 8,
  },

  mail: {
    marginLeft: 36,
    color: PRIMARY,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
