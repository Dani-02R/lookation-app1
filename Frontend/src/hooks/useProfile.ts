import { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export function useProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const ref = firestore().collection('users').doc(user.uid);
    const unsub = ref.onSnapshot((snap) => setProfile(snap.data() ?? null));
    return unsub;
  }, [user?.uid]);

  return { user, profile, loading };
}
