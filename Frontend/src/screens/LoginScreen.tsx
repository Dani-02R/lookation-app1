// frontend/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ImageBackground, SafeAreaView, StatusBar, Platform, Image
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0082FA" />

      <View style={styles.container}>
        {/* Fondo del login */}
        <ImageBackground
          source={require('../assets/login-img.png')}
          style={styles.header}
          resizeMode="cover"
        />

        {/* Tarjeta */}
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

          {/* Separador */}
          <View style={styles.orContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.line} />
          </View>

          {/* Botones sociales */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialBtn}>
              <Image source={require('../assets/google-logo.png')} 
              style={{ width: wp('6.5%'), height: wp('6.5%'),
                 resizeMode: 'contain' }}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <AntDesign name="facebook-square" size={wp('7%')} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Botón login */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Log in</Text>
          </TouchableOpacity>

          {/* Registro */}
          <Text style={styles.registerText}>
            No tienes cuenta?{' '}
            <Text style={styles.registerLink} onPress={() => navigation.navigate('Signup')}>
              Regístrate
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    padding: wp('4%'),          // 🔽 un poco menos de padding
    marginTop: -hp('9%'),       // 🔽 subido, pero no tanto para no tapar mucho la imagen
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

  forgot: { color: '#999', fontSize: wp('3.3%'), marginTop: hp('1%') },

  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp('2%'),
  },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: wp('2%'), color: '#888', fontSize: wp('3.3%') },

  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: hp('2%'),
  },

  socialBtn: {
    backgroundColor: '#fff',
    padding: wp('3%'),
    borderRadius: 12,
    marginHorizontal: wp('3%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
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
