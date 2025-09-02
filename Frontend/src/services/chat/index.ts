// src/services/chat/index.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { ChatConfig } from './config';

const convs = () => firestore().collection(ChatConfig.conversationsCollection);
const nowTs = () => firestore.FieldValue.serverTimestamp() as unknown as FirebaseFirestoreTypes.Timestamp;

export const createConversation = async (memberIds: string[]) => {
  const uniq = Array.from(new Set(memberIds)).sort();
  if (uniq.length < 2) throw new Error('Se requieren 2 miembros');

  const ref = await convs().add({
    members: uniq,
    updatedAt: nowTs(),
    lastMessage: null,     // 🔹 null en lugar de string vacío
    lastSenderId: null,    // 🔹 null en lugar de string vacío
  });

  return ref.id;
};

export const fetchOrCreateOneToOne = async (a: string, b: string) => {
  const [x, y] = Array.from(new Set([a, b])).sort();
  if (!x || !y || x === y) throw new Error('UIDs inválidos');

  // Buscar existente
  const snap = await convs().where('members', 'array-contains', x).get();
  const found = snap.docs.find(d => {
    const m = (d.data().members ?? []) as string[];
    return m.length === 2 && m.includes(y);
  });

  if (found) return found.id;

  // Crear nueva
  return createConversation([x, y]);
};

export const sendMessage = async (conversationId: string, senderId: string, text: string) => {
  const message = {
    text,
    senderId,
    createdAt: nowTs(),
    type: 'text' as const,
  };

  const batch = firestore().batch();
  const msgRef = convs().doc(conversationId).collection('messages').doc();
  batch.set(msgRef, message);

  const convRef = convs().doc(conversationId);
  batch.set(convRef, {
    lastMessage: text,
    lastSenderId: senderId,
    updatedAt: nowTs(),
  }, { merge: true });

  await batch.commit();
};
