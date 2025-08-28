// src/screens/CompleteProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Image, ActivityIndicator
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { claimGamertagAndCompleteProfile, isGamertagAvailable } from '../services/usernames';
import { useProfile } from '../hooks/useProfile';
import { toast } from '../utils/alerts';

const PRIMARY = '#0082FA';
const cover = require('../assets/complete-profile-img.png');

export default function CompleteProfileScreen({ navigation }: any) {
  const { profile, loading } = useProfile();
  const user = auth().currentUser!;
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = !!displayName.trim() && !!username.trim() && !!phone.trim();

  useEffect(() => {
    if (!loading && profile?.isProfileComplete === true) {
      navigation.replace('Home');
    }
  }, [loading, profile?.isProfileComplete, navigation]);

  useEffect(() => {
    firestore().collection('users').doc(user.uid).get().then((snap) => {
      const d = snap.data();
      if (d) {
        setDisplayName(d.displayName ?? '');
        setUsername(d.gamertag ?? '');
        setPhone(d.phone ?? '');
        setBio(d.bio ?? '');
      }
    });
  }, [user.uid]);

  const onBlurUsername = async () => {
    const u = username.trim();
    if (!u) return;
    try {
      setChecking(true);
      const ok = await isGamertagAvailable(u);
      setAvailable(ok);
    } finally {
      setChecking(false);
    }
  };

  const onSave = async () => {
    if (!canSave) {
      toast.warn('Atención', 'Completa nombre, usuario y teléfono.');
      return;
    }
    try {
      setSaving(true);
      await claimGamertagAndCompleteProfile({
        displayName,
        gamertag: username,
        phone,
        bio,
      });
      toast.success('¡Perfecto!', 'Tu perfil ha sido completado.');
      navigation.replace('Home');
    } catch (e: any) {
      toast.error('Error', e?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Encabezado */}
      <Text style={styles.subtitle}>Queremos conocerte mejor 👋</Text>
      <Text style={styles.title}>Completa tu perfil</Text>

      {/* Card */}
      <View style={styles.card}>
        {/* Imagen */}
        <Image source={cover} style={styles.cover} resizeMode="cover" />
        <Text style={styles.greeting}>✨ Te saluda el equipo Lookation 💙</Text>
        <View style={styles.greetingDivider} />

        {/* Nombre completo */}
        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Escribe tu nombre completo"
          returnKeyType="next"
          style={styles.input}
        />

        {/* Nombre de usuario */}
        <Text style={styles.label}>Nombre de usuario</Text>
        <TextInput
          value={username}
          onChangeText={(t) => { setUsername(t); setAvailable(null); }}
          onBlur={onBlurUsername}
          placeholder="ej: juanperez_21"
          autoCapitalize="none"
          returnKeyType="next"
          style={[styles.input, available === false && { borderColor: '#EF4444' }]}
        />
        {available === null && (
          <Text style={styles.helper}>Usa 3–20 caracteres: letras, números y _</Text>
        )}
        {checking ? (
          <Text style={styles.checking}>Verificando disponibilidad...</Text>
        ) : available === false ? (
          <Text style={[styles.helper, { color: '#EF4444' }]}>
            El nombre de usuario ya existe 🚫
          </Text>
        ) : available === true ? (
          <Text style={[styles.helper, { color: '#16A34A' }]}>✓ Disponible</Text>
        ) : null}

        {/* Teléfono */}
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^\d+ ]/g, ''))}
          placeholder="+57 300 000 0000"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          returnKeyType="next"
          style={styles.input}
        />

        {/* Descripción */}
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Descripción</Text>
          <Text style={styles.hint}>{bio.length}/160</Text>
        </View>
        <TextInput
          value={bio}
          onChangeText={(t) => t.length <= 160 && setBio(t)}
          placeholder="Cuéntanos un poco sobre ti"
          multiline
          numberOfLines={3}
          style={[styles.input, { textAlignVertical: 'top', height: 80 }]}
        />

        {/* separador */}
        <View style={styles.divider} />

        {/* Botón */}
        <TouchableOpacity
          style={[styles.button, (!canSave || saving) && { opacity: 0.6 }]}
          disabled={!canSave || saving}
          onPress={onSave}
          accessible
          accessibilityLabel="Guardar y continuar"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar y continuar</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Layout general */
  container: {
    padding: 20,
    paddingTop: 65, // bajamos todo un poco
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },

  /* Títulos */
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 16,
    textAlign: 'center',
  },

  /* Imagen */
  cover: {
    width: '100%',
    height: 200, // se mantiene EXACTO como pediste
    borderRadius: 12,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    color: PRIMARY,
    marginBottom: 10,
  },
  greetingDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginBottom: 12,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 2,
  },

  /* Inputs y ayudas */
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  helper: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -2,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  /* Estados */
  checking: { fontSize: 13, color: '#6B7280', marginBottom: 8 },

  /* Separadores */
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  /* Botón CTA */
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 14, // tacto un poco mejor
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
