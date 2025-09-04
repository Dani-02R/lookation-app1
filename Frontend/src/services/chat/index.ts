// src/services/chat/index.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { ChatConfig } from './config';

/** Colecciones / helpers */
const convs = () => firestore().collection(ChatConfig.conversationsCollection);
const nowTs = () =>
  firestore.FieldValue.serverTimestamp() as unknown as FirebaseFirestoreTypes.Timestamp;

const toMs = (v: any): number | null =>
  typeof v === 'number' ? v : v?.toMillis?.() ?? null;

/** Compat exists */
function snapExists(snap: any): boolean {
  if (!snap) return false;
  if (typeof snap.exists === 'function') return !!snap.exists();
  return !!snap.exists;
}

/** Llave única normalizada 1:1 */
const makePairKey = (a: string, b: string) => {
  const [x, y] = Array.from(new Set([a, b])).sort();
  if (!x || !y || x === y) throw new Error('UIDs inválidos');
  return `${x}|${y}`;
};

/** Conversación con actividad real primero */
function activityScore(data: any): number {
  const hasText = typeof data?.lastMessage === 'string' && data.lastMessage.trim().length > 0;
  const lmAt = toMs(data?.lastMessageAt);
  const upAt = toMs(data?.updatedAt);
  if (hasText) return (lmAt ?? upAt ?? 0);
  return -1; // penaliza vacías
}

/** Encuentra la mejor 1:1 entre a y b (soporta legacy, duplicadas, etc.) */
async function findBestOneToOne(a: string, b: string) {
  const pairKey = makePairKey(a, b);
  const candidates: Array<{ id: string; data: any }> = [];

  // A) Doc con id = pairKey
  try {
    const direct = await convs().doc(pairKey).get();
    if (snapExists(direct)) candidates.push({ id: direct.id, data: direct.data() || {} });
  } catch {}

  // B) Doc con campo pairKey == pairKey
  try {
    const byField = await convs().where('pairKey', '==', pairKey).get();
    byField.docs.forEach(d => {
      if (!candidates.some(c => c.id === d.id)) {
        candidates.push({ id: d.id, data: d.data() || {} });
      }
    });
  } catch {}

  // C) Legacy por members (puede traer duplicadas)
  try {
    const qs = await convs().where('members', 'array-contains-any', [a, b]).get();
    qs.docs.forEach(d => {
      const data = d.data() as any;
      const m = (data?.members ?? []) as string[];
      if (Array.isArray(m) && m.includes(a) && m.includes(b)) {
        if (!candidates.some(c => c.id === d.id)) {
          candidates.push({ id: d.id, data });
        }
      }
    });
  } catch {}

  if (!candidates.length) return null;

  candidates.sort((A, B) => {
    const sA = activityScore(A.data);
    const sB = activityScore(B.data);
    if (sA !== sB) return sB - sA;
    const tA = toMs(A.data?.updatedAt) ?? 0;
    const tB = toMs(B.data?.updatedAt) ?? 0;
    return tB - tA;
  });

  const best = candidates[0];
  return { id: best.id, data: best.data, pairKey };
}

/**
 * Reusa conversación 1:1 si existe; crea SOLO si no hay ninguna.
 * ⚠️ No sobreescribe docs existentes (evita “borrar” lastMessage*).
 */
export async function fetchOrCreateOneToOne(a: string, b: string) {
  const pairKey = makePairKey(a, b);

  // 1) Buscar existente (robusto)
  const found = await findBestOneToOne(a, b);
  if (found) {
    // Backfill de pairKey si falta, sin tocar otros campos
    if (!found.data?.pairKey) {
      try { await convs().doc(found.id).set({ pairKey }, { merge: true }); } catch {}
    }
    return found.id;
  }

  // 2) Crear NUEVA solo si no existe ninguna
  const baseDoc = {
    pairKey,
    members: pairKey.split('|'),
    updatedAt: nowTs(),
    lastMessage: null,
    lastSenderId: null,
    lastMessageAt: null,
  };

  // Preferimos ID = pairKey, pero sin pisar un doc existente
  try {
    const docRef = convs().doc(pairKey);
    const snap = await docRef.get();
    if (snapExists(snap)) return docRef.id; // ya la crearon en paralelo

    await docRef.set(baseDoc); // doc nuevo -> OK
    return docRef.id;
  } catch (e: any) {
    // Fallback: permisos que prohíben set por id fijo → add()
    const ref = await convs().add(baseDoc);
    try { await ref.set({ pairKey }, { merge: true }); } catch {}
    return ref.id;
  }
}

/** Envía mensaje y actualiza resumen sin clobber innecesario */
export async function sendMessage(conversationId: string, senderId: string, text: string) {
  const clean = (text ?? '').toString().trim();
  if (!clean) return;

  const createdAt = nowTs();

  const message = {
    text: clean,
    senderId,
    createdAt,
    type: 'text' as const,
  };

  const batch = firestore().batch();
  const convRef = convs().doc(conversationId);
  const msgRef = convRef.collection(ChatConfig.messagesSubcollection || 'messages').doc();

  batch.set(msgRef, message);
  batch.set(
    convRef,
    {
      lastMessage: clean,
      lastSenderId: senderId,
      lastMessageAt: createdAt,
      updatedAt: createdAt,
    },
    { merge: true } // ← nunca borrarás campos previos
  );

  await batch.commit();
}

/** ——— Utilidades de reparación (opcionales) ——— */

/** Recalcula lastMessage/lastMessageAt a partir del último mensaje real */
export async function ensureConversationSummary(conversationId: string) {
  const convRef = convs().doc(conversationId);
  const last = await convRef
    .collection(ChatConfig.messagesSubcollection || 'messages')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const d = last.docs[0]?.data() as any;
  if (!d) return; // no hay mensajes

  const text = (d.text ?? '').toString();
  const at = d.createdAt ?? null;

  await convRef.set(
    {
      lastMessage: text,
      lastSenderId: d.senderId ?? null,
      lastMessageAt: at,
      updatedAt: at || nowTs(),
    },
    { merge: true }
  );
}

/** Repara todas las 1:1 de un usuario (por si quedaron “vacías” de resumen) */
export async function repairSummariesForUser(uid: string) {
  const qs = await convs().where('members', 'array-contains', uid).get();
  for (const doc of qs.docs) {
    try { await ensureConversationSummary(doc.id); } catch {}
  }
}

export { FirebaseFirestoreTypes };
