// src/hooks/useFriendUids.ts
import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';

/**
 * Devuelve los UIDs de los amigos del usuario autenticado.
 * Lee la colección /friends donde status == "accepted"
 */
export function useFriendUids(myUid?: string | null) {
  const [uids, setUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myUid) {
      setUids([]);
      setLoading(false);
      return;
    }

    const unsub = firestore()
      .collection('friends')
      .where('status', '==', 'accepted')
      .where('members', 'array-contains', myUid) // usamos el array de miembros
      .onSnapshot(
        (snap) => {
          const all: string[] = [];
          snap.forEach((doc) => {
            const data = doc.data() as any;
            const others = (data.members || []).filter((m: string) => m !== myUid);
            all.push(...others);
          });
          setUids(Array.from(new Set(all))); // eliminamos duplicados
          setLoading(false);
        },
        (err) => {
          console.error('useFriendUids error', err);
          setUids([]);
          setLoading(false);
        }
      );

    return () => unsub();
  }, [myUid]);

  return { uids, loading };
}
