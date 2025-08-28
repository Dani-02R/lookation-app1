import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { updateUserProfile } from '../services/userProfile';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { toast } from '../utils/alerts';

const PRIMARY = '#0082FA';

export default function EditProfileScreen({ navigation }: any) {
  const user = auth().currentUser!;
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);

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
      setSaving(true);
      await updateUserProfile({ displayName, bio, phone, photoURL: photoURL || undefined });
      toast.success('¡Perfil actualizado!', 'Tus cambios se han guardado correctamente.');
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message ?? 'No se pudo actualizar el perfil';
      toast.error('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const avatarSource = photoURL ? { uri: photoURL } : require('../assets/Img-Perfil.jpeg');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Editar perfil</Text>

        <View style={styles.avatarWrap}>
          <Image source={avatarSource} style={styles.avatar} />
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
          style={[styles.input, styles.inputMultiline]}
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

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) / 3 : 0,
  },
  content: {
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2%'),
    paddingBottom: hp('3%'),
    backgroundColor: '#fff',
  },

  title: {
    fontSize: wp('5%'),
    fontWeight: '800',
    marginBottom: hp('1.5%'),
    color: '#111',
  },

  avatarWrap: {
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  avatar: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
  },

  label: {
    marginTop: hp('1%'),
    marginBottom: hp('0.6%'),
    color: '#555',
    fontWeight: '600',
    fontSize: wp('3.6%'),
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('3.5%'),
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: wp('3.8%'),
  },
  inputMultiline: {
    height: hp('14%'),
    textAlignVertical: 'top',
  },

  saveBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: hp('1.8%'),
    borderRadius: 12,
    alignItems: 'center',
    marginTop: hp('2.2%'),
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: wp('4%'),
  },
});
