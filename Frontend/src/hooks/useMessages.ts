import { useCallback, useEffect, useState } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { ChatConfig } from '../services/chat/config';

export type Message = { id: string; text: string; senderId: string; createdAt: any; type?: 'text'|'image' };
const PAGE = 25;

export function useMessages(conversationId?: string) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    const ref = firestore()
      .collection(ChatConfig.conversationsCollection).doc(conversationId)
      .collection(ChatConfig.messagesSubcollection)
      .orderBy('createdAt', 'desc')
      .limit(PAGE);

    const unsub = ref.onSnapshot(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Message[];
      setMsgs(data);
      setCursor(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.size === PAGE);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !cursor || !hasMore) return;
    const ref = firestore()
      .collection(ChatConfig.conversationsCollection).doc(conversationId)
      .collection(ChatConfig.messagesSubcollection)
      .orderBy('createdAt', 'desc')
      .startAfter(cursor)
      .limit(PAGE);

    const snap = await ref.get();
    const older = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Message[];
    setMsgs(prev => [...prev, ...older]);
    setCursor(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.size === PAGE);
  }, [conversationId, cursor, hasMore]);

  return { msgs, loading, loadMore, hasMore };
}
