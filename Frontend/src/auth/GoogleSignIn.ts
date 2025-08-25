// frontend/src/auth/GoogleSignIn.ts
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Inicializa Google Sign-In
GoogleSignin.configure({
  webClientId: '677584857229-e7q3gkost1k7be9ik85kpl57n7j7o0ls.apps.googleusercontent.com',
});

export const signInWithGoogle = async () => {
  try {
    // Abre el popup de Google y obtiene datos básicos del usuario
    await GoogleSignin.signIn();

    // Obtén los tokens (aquí sí viene el idToken)
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) {
      throw new Error("No se recibió idToken de Google");
    }

    // Crea la credencial para Firebase
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Inicia sesión en Firebase
    return await auth().signInWithCredential(googleCredential);
  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    return null;
  }
};

// Nueva función para cerrar sesión
export const signOutGoogle = async () => {
  try {
    // Cierra sesión en Firebase
    await auth().signOut();

    // Cierra sesión de Google
    await GoogleSignin.signOut();

    console.log("Sesión cerrada correctamente");
  } catch (error) {
    console.error('Error en signOutGoogle:', error);
  }
};
