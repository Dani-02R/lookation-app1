// src/services/chat/index.ts
import firestore from '@react-native-firebase/firestore';
import { ChatConfig } from './config';

const convs = () => firestore().collection(ChatConfig.conversationsCollection);
const now = () => firestore.FieldValue.serverTimestamp();

const preview = (s: string) => {
  const t = (s || '').trim();
  return t.length <= 140 ? t : t.slice(0, 140) + '…';
};

export const createConversation = async (memberIds: string[]) => {
  const uniq = Array.from(new Set(memberIds)).sort();
  if (uniq.length < 2) throw new Error('Se requieren 2 miembros');

  const pairKey = `${uniq[0]}__${uniq[1]}`;
  const ref = convs().doc();

  await ref.set({
    id: ref.id,
    members: uniq,
    pairKey,
    updatedAt: now(),
    lastMessage: null,
    lastMessageAt: null,
    lastSenderId: null,
    // opcional: membersMeta
  });

  return ref.id;
};

export const fetchOrCreateOneToOne = async (a: string, b: string) => {
  const [x, y] = Array.from(new Set([a, b])).sort();
  if (!x || !y || x === y) throw new Error('UIDs inválidos');

  const pairKey = `${x}__${y}`;
  const q = await convs().where('pairKey', '==', pairKey).limit(1).get();
  if (!q.empty) return q.docs[0].id;

  return createConversation([x, y]);
};

/**
 * Escribe el mensaje con campos compatibles:
 *  - authorId y senderId (ambos)
 *  - createdAt y sentAt (ambos)
 * Esto evita romper ChatRoom o reglas antiguas.
 */
export const sendMessage = async (conversationId: string, senderId: string, text: string) => {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  const convRef = convs().doc(conversationId);
  const msgRef = convRef.collection(ChatConfig.messagesSubcollection).doc();
  const ts = now();

  const message = {
    id: msgRef.id,
    text: trimmed,
    // ✅ compat nombres
    authorId: senderId,
    senderId: senderId,
    // ✅ compat timestamps
    createdAt: ts,
    sentAt: ts,
    type: 'text' as const,
  };

  await firestore().runTransaction(async (tx) => {
    tx.set(msgRef, message);

    tx.set(
      convRef,
      {
        lastMessage: preview(trimmed),
        lastMessageAt: ts,
        lastSenderId: senderId,
        updatedAt: ts,
      },
      { merge: true }
    );
  });
};
