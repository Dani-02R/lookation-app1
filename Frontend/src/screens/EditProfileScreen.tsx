import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { updateUserProfile } from '../services/userProfile';

const PRIMARY = '#0082FA';

export default function EditProfileScreen({ navigation }: any) {
  const user = auth().currentUser!;
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    const ref = firestore().collection('users').doc(user.uid);
    ref.get().then((snap) => {
      const d = snap.data() || {};
      setDisplayName(d.displayName ?? user.displayName ?? '');
      setBio(d.bio ?? '');
      setPhone(d.phone ?? '');
      setPhotoURL(d.photoURL ?? user.photoURL ?? '');
    });
  }, [user.uid]);

  const onSave = async () => {
    try {
      await updateUserProfile({ displayName, bio, phone, photoURL: photoURL || undefined });
      Alert.alert('Listo', 'Perfil actualizado');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo actualizar el perfil');
    }
  };

  const avatarSource = photoURL ? { uri: photoURL } : require('../assets/Img-Perfil.jpeg');

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Editar perfil</Text>

      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Image source={avatarSource} style={{ width: 80, height: 80, borderRadius: 40 }} />
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Tu nombre visible"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
        value={bio}
        onChangeText={setBio}
        placeholder="Cuenta algo sobre ti"
        multiline
      />

      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+57 300 000 0000"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Foto (URL)</Text>
      <TextInput
        style={styles.input}
        value={photoURL}
        onChangeText={setPhotoURL}
        placeholder="https://… (opcional)"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveText}>Guardar cambios</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  label: { marginTop: 10, marginBottom: 6, color: '#555', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10,
    backgroundColor: '#fff'
  },
  saveBtn: {
    backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 18
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
