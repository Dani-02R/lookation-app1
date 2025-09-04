// src/screens/ChatRoomScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../auth/AuthProvider';
import { useMessages } from '../hooks/useMessages';
import { sendMessage } from '../services/chat';
import MessageBubble from '../components/MessageBubble';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

const K_MSG_HEADS = 'chat:headsCache:v1';

function toMs(v: any): number | null {
  if (!v) return null;
  if (typeof v === 'number') return v;
  return v?.toMillis?.() ?? null;
}

export default function ChatRoomScreen({ route }: Props) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const me = user?.uid ?? null;

  const { msgs, loadMore, hasMore } = useMessages(conversationId);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Mensajes "optimistas" (pendientes) en orden DESC (nuevo -> viejo)
  const [pending, setPending] = useState<Array<{
    id: string;
    text: string;
    senderId: string;
    createdAt: number; // ms
  }>>([]);

  const listRef = useRef<FlatList<any>>(null);

  const scrollToBottom = useCallback(() => {
    // Con data ascendente (antiguo->nuevo), scrollToEnd va al mensaje más reciente
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  // === Merge de data para la lista ===
  // asumimos que msgs viene DESC (nuevo -> viejo); mostramos ASC
  const dataAsc = useMemo(() => {
    // Unimos primero los pending (DESC), luego los reales (DESC)
    // y por último lo invertimos para mostrar ASC
    const desc = [...pending, ...msgs];
    const asc = [...desc].reverse();
    return asc;
  }, [msgs, pending]);

  // Desplázate al último cuando lleguen mensajes nuevos reales o pendientes
  useEffect(() => {
    scrollToBottom();
  }, [msgs.length, pending.length, scrollToBottom]);

  // isOwn / createdAt normalizados
  const isOwn = useCallback(
    (m: any) => {
      const from = m?.authorId ?? m?.senderId;
      return !!me && from === me;
    },
    [me]
  );

  const getCreatedMs = useCallback((m: any): number | null => {
    return toMs(m?.createdAt ?? m?.sentAt);
  }, []);

  // Actualiza la caché de heads para que la lista de chats pinte instantáneo
  const updateHeadsCache = useCallback(async (convId: string, text: string, atMs: number) => {
    try {
      const raw = await AsyncStorage.getItem(K_MSG_HEADS);
      const parsed = raw ? JSON.parse(raw) : { data: {}, updatedAt: 0 };
      parsed.data = parsed.data || {};
      parsed.data[convId] = { text, at: atMs };
      parsed.updatedAt = Date.now();
      await AsyncStorage.setItem(K_MSG_HEADS, JSON.stringify(parsed));
    } catch {
      // silencioso
    }
  }, []);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !me) return;
    const now = Date.now();
    const tempId = `tmp:${now}`;

    // 1) UI optimista
    setPending(prev => [{ id: tempId, text: t, senderId: me, createdAt: now }, ...prev]);

    // 2) Actualiza heads cache para que ChatsScreen muestre al instante
    updateHeadsCache(conversationId, t, now);

    try {
      setSending(true);
      setText('');
      await sendMessage(conversationId, me, t);
      // No removemos el pending aquí para evitar parpadeo;
      // lo reconciliamos cuando llegue el snapshot real (abajo).
      setTimeout(scrollToBottom, 10);
    } catch (e: any) {
      // revertir UI optimista si falla
      setPending(prev => prev.filter(p => p.id !== tempId));
      Alert.alert('Error', e?.message ?? 'No se pudo enviar el mensaje.');
      setText(t);
    } finally {
      setSending(false);
    }
  }, [text, me, conversationId, scrollToBottom, updateHeadsCache]);

  // Reconciliación: cuando llega el snapshot verdadero, quita los pending equivalentes
  useEffect(() => {
    if (!pending.length) return;

    setPending(prev => {
      if (!prev.length) return prev;
      const realDesc = msgs; // viene DESC

      const next = prev.filter(p => {
        // ¿Existe un real que matchee?
        const match = realDesc.find((m: any) => {
          if (!isOwn(m)) return false;
          const mt = (m?.text ?? '').toString();
          if (mt !== p.text) return false;
          const mAt = getCreatedMs(m);
          if (!mAt) return false;
          // margen de 15s para clock-skew / serverTimestamp
          return Math.abs(mAt - p.createdAt) < 15000;
        });
        // si hay match, quitamos el pending
        return !match;
      });
      return next;
    });
  }, [msgs, pending.length, isOwn, getCreatedMs]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
        <FlatList
          ref={listRef}
          data={dataAsc}
          keyExtractor={(m: any) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text ?? ''}
              isOwn={isOwn(item)}
            />
          )}
          onEndReachedThreshold={0.2}
          onEndReached={() => hasMore && loadMore()}
          // Mantiene anclaje cuando se agregan mensajes
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={
            hasMore ? (
              <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 8 }}>
                Cargar más…
              </Text>
            ) : <View style={{ height: 8 }} />
          }
          removeClippedSubviews
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={9}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
          borderTopWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje"
          style={{ flex: 1, padding: 12, maxHeight: 120 }}
          multiline
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={() => {
            // iOS con multiline casi nunca dispara, Android sí.
            if (!sending && text.trim()) onSend();
          }}
        />
        <TouchableOpacity
          onPress={onSend}
          style={{ padding: 8 }}
          disabled={!text.trim() || sending}
        >
          <Icon
            name="send"
            size={24}
            color={!text.trim() || sending ? '#94a3b8' : '#0082FA'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
