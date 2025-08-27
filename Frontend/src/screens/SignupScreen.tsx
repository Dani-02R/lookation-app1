// frontend/src/screens/SignupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, SafeAreaView,
  StatusBar, Platform, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import auth from '@react-native-firebase/auth';
import { showMessage } from 'react-native-flash-message';

type SignupScreenProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

export default function SignupScreen() {
  const navigation = useNavigation<SignupScreenProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const e = email.trim().toLowerCase();
    const p1 = password;
    const p2 = confirmPassword;

    if (!e || !p1 || !p2) {
      showMessage({ type: 'warning', message: 'Completa todos los campos.' });
      return;
    }
    // Validaciones simples
    const emailOk = /\S+@\S+\.\S+/.test(e);
    if (!emailOk) {
      showMessage({ type: 'warning', message: 'Ingresa un email válido.' });
      return;
    }
    if (p1.length < 6) {
      showMessage({ type: 'warning', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (p1 !== p2) {
      showMessage({ type: 'warning', message: 'Las contraseñas no coinciden.' });
      return;
    }

    try {
      setLoading(true);
      await auth().createUserWithEmailAndPassword(e, p1);
      // ❌ No navegues manualmente. App.tsx (onAuthStateChanged + upsert) decide:
      // - Si isProfileComplete=false → CompleteProfile
      // - Si true → Home
      showMessage({ type: 'success', message: 'Cuenta creada. ¡Bienvenido!' });
    } catch (err: any) {
      let msg = 'No se pudo crear la cuenta.';
      if (err?.code === 'auth/email-already-in-use') msg = 'Ese email ya está registrado.';
      else if (err?.code === 'auth/invalid-email') msg = 'Email inválido.';
      else if (err?.code === 'auth/weak-password') msg = 'Contraseña muy débil.';
      showMessage({ type: 'danger', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0082FA" />

      <View style={styles.container}>
        {/* Fondo del signup */}
        <ImageBackground
          source={require('../assets/signup-img.png')}
          style={styles.header}
          resizeMode="cover"
        />

        {/* Tarjeta */}
        <View style={styles.card}>
          <Text style={styles.welcome}>Crea tu cuenta</Text>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.inactiveTabText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={styles.activeTabText}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Botón signup */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign up</Text>
            )}
          </TouchableOpacity>

          {/* Ya tienes cuenta */}
          <Text style={styles.registerText}>
            ¿Ya tienes cuenta?{' '}
            <Text style={styles.registerLink} onPress={() => navigation.navigate('Login')}>
              Inicia sesión
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0082FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! / 3 : 0,
  },
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: hp('40%'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0082FA',
    width: '100%',
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: wp('7%'),
    borderRadius: 18,
    padding: wp('5%'),
    marginTop: -hp('7%'),
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },

  welcome: {
    fontSize: wp('4.5%'),
    fontWeight: 'bold',
    color: '#0082FA',
    textAlign: 'center',
    marginBottom: hp('1.5%'),
  },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
    borderRadius: 20,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },

  tab: { flex: 1, paddingVertical: hp('1.2%'), alignItems: 'center' },
  activeTab: { backgroundColor: '#0082FA' },
  activeTabText: { color: '#fff', fontWeight: 'bold', fontSize: wp('4%') },
  inactiveTabText: { color: '#777', fontSize: wp('4%') },

  input: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginVertical: hp('1%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('2%'),
    fontSize: wp('3.8%'),
  },

  loginBtn: {
    backgroundColor: '#0082FA',
    borderRadius: 10,
    marginTop: hp('2%'),
    height: hp('6.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: wp('4.5%'),
  },

  registerText: {
    textAlign: 'center',
    marginTop: hp('2%'),
    color: '#666',
    fontSize: wp('3.3%'),
  },

  registerLink: {
    color: '#0082FA',
    fontWeight: 'bold',
  },
});
