// src/hooks/useChats.ts
import { useEffect, useRef, useState } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { ChatConfig } from '../services/chat/config';

export type Conversation = {
  id: string;
  members: string[];
  lastMessage?: string | null;
  lastSenderId?: string | null;
  lastMessageAt?: number | null; // ms
  updatedAt?: number | null;      // ms
  membersMeta?: Record<string, { displayName?: string; photoURL?: string | null; username?: string | null }> | null;
};

const toMs = (v: any): number | null => {
  if (!v) return null;
  if (typeof v === 'number') return v;
  return (v as FirebaseFirestoreTypes.Timestamp)?.toMillis?.() ?? null;
};

export function useChats(uid?: string | null) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // evita listeners duplicados al cambiar uid
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    // limpia listener previo
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    // mostramos loading solo si no teníamos datos; así evitamos “saltos” al cambiar rápido
    setLoading((prev) => (items.length ? prev : true));

    const coll = firestore().collection(ChatConfig.conversationsCollection);
    const withOrder = coll
      .where('members', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .limit(50);

    const withoutOrder = coll
      .where('members', 'array-contains', uid)
      .limit(50);

    let usingFallback = false;

    const mapDocs = (snap: FirebaseFirestoreTypes.QuerySnapshot): Conversation[] => {
      const list: Conversation[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as any;
        list.push({
          id: doc.id,
          members: d.members ?? [],
          lastMessage: d.lastMessage ?? null,
          lastSenderId: d.lastSenderId ?? null,
          lastMessageAt: toMs(d.lastMessageAt),
          updatedAt: toMs(d.updatedAt),
          membersMeta: d.membersMeta ?? null,
        });
      });
      return list;
    };

    const subscribe = (query: FirebaseFirestoreTypes.Query, sortClient = false) => {
      const unsub = query.onSnapshot(
        (snap) => {
          // ⚡ cache-first: esto pinta de inmediato lo que haya en local
          const list = mapDocs(snap);
          const out = sortClient
            ? list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
            : list;

          setItems(out);
          setLoading(false);
        },
        (err: any) => {
          // si falta índice para orderBy, rehacemos sin order y ordenamos en cliente
          if (!usingFallback && err?.code === 'failed-precondition') {
            usingFallback = true;
            if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
            unsubRef.current = subscribe(withoutOrder, true);
            return;
          }
          console.warn('useChats snapshot error:', err);
          setItems([]);
          setLoading(false);
        }
      );
      return unsub;
    };

    // suscribe con orderBy (rápido, cache-first)
    unsubRef.current = subscribe(withOrder, false);

    // cleanup
    return () => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return { items, loading };
}
