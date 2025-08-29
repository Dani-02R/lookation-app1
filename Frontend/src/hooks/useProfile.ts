import { useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type Profile = Record<string, any> | null;

export function useProfile() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escucha cambios de auth y exige email verificado
    const unsub = auth().onAuthStateChanged((u) => {
      (async () => {
        try {
          if (u) {
            // refresca el estado (emailVerified puede cambiar tras abrir el link)
            await u.reload();
          }
          // Solo damos por válido si el correo está verificado
          const verifiedUser = u && u.emailVerified ? u : null;
          setUser(verifiedUser);
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
      })();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); return; }

    const ref = firestore().collection('users').doc(user.uid);
    const unsub = ref.onSnapshot((snap) => {
      // snap.data() => undefined si el doc no existe
      const data = snap.data();
      setProfile((data as Profile) ?? null);
    });

    return unsub;
  }, [user?.uid]);

  return { user, profile, loading };
}
