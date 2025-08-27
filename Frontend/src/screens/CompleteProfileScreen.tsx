// src/screens/CompleteProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { claimGamertagAndCompleteProfile, isGamertagAvailable } from '../services/usernames';
import { useProfile } from '../hooks/useProfile';

export default function CompleteProfileScreen({ navigation }: any) {
  const { profile, loading } = useProfile();        // 👈 perfil en vivo
  const user = auth().currentUser!;
  const [displayName, setDisplayName] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const canSave = displayName.trim() && gamertag.trim();

  // 🔒 Guard: si el perfil ya está completo, no muestres esta pantalla
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
        setGamertag(d.gamertag ?? '');
      }
    });
  }, [user.uid]);

  const onBlurGamertag = async () => {
    if (!gamertag.trim()) return;
    setChecking(true);
    const ok = await isGamertagAvailable(gamertag);
    setAvailable(ok);
    setChecking(false);
  };

  const onSave = async () => {
    try {
      await claimGamertagAndCompleteProfile({ displayName, gamertag }); // ← setea isProfileComplete: true
      Alert.alert('Listo', 'Perfil completado');
      navigation.replace('Home'); // navegación inmediata
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Cuéntanos más sobre ti</Text>

      <Text>Nombre</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Nombre"
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text>Gamertag</Text>
      <TextInput
        value={gamertag}
        onChangeText={(t) => { setGamertag(t); setAvailable(null); }}
        onBlur={onBlurGamertag}
        placeholder="tu_gamertag"
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10, marginBottom: 6 }}
      />
      {checking ? <Text>Verificando...</Text> :
        available === false ? <Text style={{ color: 'tomato' }}>No disponible</Text> :
        available === true ? <Text style={{ color: 'green' }}>Disponible</Text> : null}

      <Button title="Guardar y continuar" onPress={onSave} disabled={!canSave} />
    </ScrollView>
  );
}
