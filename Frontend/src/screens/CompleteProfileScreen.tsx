// src/screens/CompleteProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { claimGamertagAndCompleteProfile, isGamertagAvailable } from '../services/usernames';
import { useProfile } from '../hooks/useProfile';
import { toast } from '../utils/alerts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const PRIMARY = '#0082FA';
const cover = require('../assets/complete-profile-img.png');

export default function CompleteProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets(); // 👈 usa safe area real
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
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            placeholderTextColor="#000" 
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
            placeholderTextColor="#000" 
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
            placeholderTextColor="#000" 
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // menos padding arriba; dejamos que el SafeArea lo maneje
  container: {
    paddingHorizontal: wp('5%'),
    paddingBottom: hp('2%'),
  },

  // Títulos (menos márgen)
  subtitle: {
    fontSize: wp('3.6%'),
    fontWeight: '500',
    color: '#6B7280',
    marginTop: hp('3%'),
    marginBottom: hp('0.4%'),
    textAlign: 'center',
  },
  title: {
    fontSize: wp('6%'),
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: hp('1.2%'),
    textAlign: 'center',
  },

  // Card (márgen superior pequeño)
  card: {
    backgroundColor: '#fff',
    borderRadius: wp('3.5%'),
    padding: wp('4%'),
    marginTop: hp('0.6%'),
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 2,
  },

  cover: {
    width: '100%',
    height: hp('22%'), // más compacto
    borderRadius: wp('3%'),
    marginBottom: hp('0.8%'),
  },
  greeting: {
    fontSize: wp('3.6%'),
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    color: PRIMARY,
    marginBottom: hp('0.8%'),
  },
  greetingDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginBottom: hp('1%'),
  },

  label: {
    fontSize: wp('3.6%'),
    fontWeight: '600',
    marginBottom: hp('0.4%'),
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: wp('2.6%'),
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('3%'),
    marginBottom: hp('1%'),
    fontSize: wp('3.6%'),
    backgroundColor: '#F9FAFB',
   
  },
  textArea: {
    textAlignVertical: 'top',
    height: hp('11.5%'),
  },
  helper: {
    fontSize: wp('3%'),
    color: '#94A3B8',
    marginTop: -hp('0.2%'),
    marginBottom: hp('1%'),
  },
  hint: {
    fontSize: wp('3%'),
    color: '#94A3B8',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  checking: { fontSize: wp('3.1%'), color: '#6B7280', marginBottom: hp('0.8%') },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: hp('1%') },

  button: {
    backgroundColor: PRIMARY,
    paddingVertical: hp('1.6%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('0.4%'),
  },
  buttonText: {
    color: '#fff',
    fontSize: wp('4%'),
    fontWeight: '700',
  },
});
