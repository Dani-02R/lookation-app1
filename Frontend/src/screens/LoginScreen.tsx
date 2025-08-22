// frontend/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Image } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type LoginScreenProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Email:', email, 'Password:', password);
  };

  const handleForgotPassword = () => {
    navigation.navigate('request-code', { email });
  };
  

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/login-img.png')}
        style={styles.header}
        resizeMode="cover"
      >
        <Text style={styles.logoText}></Text>
      </ImageBackground>

      <View style={styles.card}>
        <Text style={styles.welcome}>¡Bienvenido a Lookation!</Text>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={styles.activeTabText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.inactiveTabText}>Sign up</Text>
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

        {/* Forgot password */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>Or</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialBtn}>
            <Image
              source={require('../assets/google-logo.png')}
              style={{ width: 26, height: 26, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <AntDesign name="facebook-square" size={28} color="#1877F2" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnText}>Log in</Text>
        </TouchableOpacity>

        <Text style={styles.registerText}>
          No tienes cuenta?{' '}
          <Text style={styles.registerLink} onPress={() => navigation.navigate('Signup')}>
            Regístrate
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 345,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0082FA',
    width: '100%',
  },
  logoText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 30,
    borderRadius: 18,
    padding: 18,
    marginTop: -55,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  welcome: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0082FA',
    textAlign: 'center',
    marginBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 20,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#0082FA' },
  activeTabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  inactiveTabText: { color: '#777', fontSize: 15 },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 15,
  },
  forgot: { color: '#999', fontSize: 13, marginTop: 8 },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: 8, color: '#888', fontSize: 13 },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  socialBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  loginBtn: {
    backgroundColor: '#0082FA',
    borderRadius: 10,
    marginTop: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 17,
  },
  registerText: {
    textAlign: 'center',
    marginTop: 14,
    color: '#666',
    fontSize: 13,
  },
  registerLink: {
    color: '#0082FA',
    fontWeight: 'bold',
  },
});
