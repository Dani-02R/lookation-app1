// frontend/src/auth/googleAuth.ts
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Inicializa Google Sign-In (solo una vez en tu app, puede ser en App.tsx también)
GoogleSignin.configure({
  webClientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com', //  client ID de Firebase
});

export const signInWithGoogle = async () => {
  try {
    // Abre el popup de Google
    const { idToken } = await GoogleSignin.signIn();

    // Crea la credencial para Firebase
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Inicia sesión en Firebase con esa credencial
    return auth().signInWithCredential(googleCredential);
  } catch (error) {
    console.error('Error en signInWithGoogle:', error);
    return null;
  }
};
