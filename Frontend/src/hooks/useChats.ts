// src/hooks/useChats.ts
import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { ChatConfig } from '../services/chat/config';

export type Conversation = {
  id: string;
  members: string[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt?: any;
};

export function useChats(uid?: string | null) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no hay uid, no suscribimos y no dejamos el spinner encendido
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true); // al cambiar de uid, mostrar carga mientras suscribe

    const ref = firestore()
      .collection(ChatConfig.conversationsCollection)
      .where('members', 'array-contains', uid)
      .orderBy('updatedAt', 'desc');

    const unsub = ref.onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.warn('useChats snapshot error:', err);
        setItems([]);
        setLoading(false);
      }
    );

    // cleanup del listener al cambiar uid o desmontar
    return unsub;
  }, [uid]);

  return { items, loading };
}
