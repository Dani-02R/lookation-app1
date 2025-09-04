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
  Image,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  DeviceEventEmitter,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { useMessages } from '../hooks/useMessages';
import { sendMessage } from '../services/chat';
import MessageBubble from '../components/MessageBubble';
import { ChatConfig, type UIUser } from '../services/chat/config';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

const K_MSG_HEADS = 'chat:headsCache:v1';

const COLORS = {
  primary: '#0082FA',
  bg: '#F6F7FB',
  border: '#E5E7EB',
  text: '#0F172A',
  subtext: '#64748B',
  inputBg: '#F1F5F9',
  ownTime: '#CBD5E1',
  otherTime: '#94A3B8',
};

function toMs(v: any): number | null {
  if (!v) return null;
  if (typeof v === 'number') return v;
  return v?.toMillis?.() ?? null;
}

function fmtTime(ms?: number | null) {
  if (!ms) return '';
  const d = new Date(ms);
  try {
    return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { conversationId, otherId } = route.params;
  const { user } = useAuth();
  const me = user?.uid ?? null;

  const { msgs, loadMore, hasMore } = useMessages(conversationId);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Responsividad
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const bubbleMaxWidth = isTablet ? '65%' : '82%';
  const inputMaxH = Math.max(100, Math.min(160, Math.floor(height * 0.25)));

  // Header (avatar/nombre)
  const [other, setOther] = useState<UIUser | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!otherId) return;
      try {
        const u = await ChatConfig.getUserByUid(otherId);
        if (alive) setOther(u);
      } catch {}
    })();
    return () => { alive = false; };
  }, [otherId]);

  // Pendientes optimistas (DESC: nuevo -> viejo)
  const [pending, setPending] = useState<Array<{
    id: string;
    text: string;
    senderId: string;
    createdAt: number; // ms
  }>>([]);

  const listRef = useRef<FlatList<any>>(null);

  /** Con lista invertida, el "último" está en offset 0 */
  const scrollToLatest = useCallback((animated = true) => {
    try {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    } catch {}
  }, []);

  // Data para FlatList — DESC (nuevo -> viejo) porque usaremos inverted
  const dataDesc = useMemo(() => {
    // msgs viene DESC según tu hook; pending ya está DESC también
    // Si tu hook llegara a ser ASC en algún momento, cámbialo a: [...pending, ...msgs].sort((a,b)=>getTime(b)-getTime(a))
    return [...pending, ...msgs];
  }, [msgs, pending]);

  // FAB: si estamos lejos del último (offset alto), mostramos botón
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const onScroll = useCallback((e: any) => {
    // En inverted, estar "lejos del último" significa tener offset grande
    const { y } = e.nativeEvent.contentOffset;
    setShowScrollBtn(y > 120);
  }, []);

  // Helpers
  const isOwn = useCallback(
    (m: any) => {
      const from = m?.authorId ?? m?.senderId;
      return !!me && from === me;
    },
    [me]
  );
  const getCreatedMs = useCallback((m: any): number | null => toMs(m?.createdAt ?? m?.sentAt), []);

  // Heads cache + evento para lista de chats
  const updateHeadsCache = useCallback(async (convId: string, headText: string, atMs: number) => {
    try {
      const raw = await AsyncStorage.getItem(K_MSG_HEADS);
      const parsed = raw ? JSON.parse(raw) : { data: {}, updatedAt: 0 };
      parsed.data = parsed.data || {};
      parsed.data[convId] = { text: headText, at: atMs };
      parsed.updatedAt = Date.now();
      await AsyncStorage.setItem(K_MSG_HEADS, JSON.stringify(parsed));
      DeviceEventEmitter.emit('CHAT_HEAD', { conversationId: convId, text: headText, at: atMs });
    } catch {}
  }, []);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !me) return;
    const now = Date.now();
    const tempId = `tmp:${now}`;

    // UI optimista (DESC)
    setPending(prev => [{ id: tempId, text: t, senderId: me, createdAt: now }, ...prev]);
    updateHeadsCache(conversationId, t, now);

    try {
      setSending(true);
      setText('');
      await sendMessage(conversationId, me, t);
      // con inverted, desplazarse al último = offset 0
      requestAnimationFrame(() => scrollToLatest(true));
    } catch (e: any) {
      setPending(prev => prev.filter(p => p.id !== tempId));
      Alert.alert('Error', e?.message ?? 'No se pudo enviar el mensaje.');
      setText(t);
    } finally {
      setSending(false);
    }
  }, [text, me, conversationId, updateHeadsCache, scrollToLatest]);

  // Reconciliar pendientes cuando llegan reales
  useEffect(() => {
    if (!pending.length) return;
    setPending(prev => {
      if (!prev.length) return prev;
      const realDesc = msgs; // DESC
      const next = prev.filter(p => {
        const match = realDesc.find((m: any) => {
          if (!isOwn(m)) return false;
          const mt = (m?.text ?? '').toString();
          if (mt !== p.text) return false;
          const mAt = getCreatedMs(m);
          if (!mAt) return false;
          return Math.abs(mAt - p.createdAt) < 15000;
        });
        return !match;
      });
      return next;
    });
  }, [msgs, pending.length, isOwn, getCreatedMs]);

  // Título
  const title =
    (other?.username && other.username.startsWith('@')) ? other.username :
    (other?.displayName || 'Chat');

  // Safe area offsets
  const keyboardOffset = Platform.OS === 'ios' ? 8 + insets.top : 0;
  const fabBottom = 86 + (Platform.OS === 'ios' ? insets.bottom : 0);

  // Al montar, ya aparece el último porque inverted + dataDesc (nuevo->viejo)
  // Aún así, garantizamos estar en offset 0 tras el primer frame:
  useEffect(() => {
    const t = setTimeout(() => scrollToLatest(false), 0);
    return () => clearTimeout(t);
  }, [scrollToLatest]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header grande */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="chevron-left" size={32} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            {other?.photoURL ? (
              <Image source={{ uri: other.photoURL }} style={styles.headerAvatar} />
            ) : (
              <Icon name="account-circle" size={44} color={COLORS.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>conectado • mensajes</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Icon name="phone-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Icon name="dots-vertical" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={keyboardOffset}
      >
        {/* Mensajes (inverted) */}
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            inverted
            data={dataDesc} // DESC: nuevo -> viejo
            keyExtractor={(m: any) => m.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}
            renderItem={({ item }) => {
              const own = isOwn(item);
              const at = getCreatedMs(item);
              return (
                <View style={{ marginVertical: 2, alignItems: own ? 'flex-end' : 'flex-start' }}>
                  <View style={{ maxWidth: bubbleMaxWidth, alignSelf: own ? 'flex-end' : 'flex-start' }}>
                    <MessageBubble text={item.text ?? ''} isOwn={own} />
                  </View>
                  {!!at && (
                    <Text
                      style={[
                        styles.msgTime,
                        own ? { alignSelf: 'flex-end', color: COLORS.ownTime } : { alignSelf: 'flex-start', color: COLORS.otherTime },
                      ]}
                    >
                      {fmtTime(at)}
                    </Text>
                  )}
                </View>
              );
            }}
            onScroll={onScroll}
            onEndReachedThreshold={0.2}
            onEndReached={() => hasMore && loadMore()} // en inverted, esto se dispara al acercarte a los mensajes viejos (arriba)
            // Mantiene el "anclaje" visual cuando entran nuevos
            maintainVisibleContentPosition={{ minIndexForVisible: 1, autoscrollToTopThreshold: 20 }}
            ListFooterComponent={
              hasMore ? (
                <Text style={{ textAlign: 'center', color: COLORS.subtext, padding: 8 }}>
                  Cargar más…
                </Text>
              ) : <View style={{ height: 8 }} />
            }
            removeClippedSubviews
            initialNumToRender={14}
            maxToRenderPerBatch={14}
            windowSize={9}
          />

          {/* Botón flotante: volver al último (offset 0) */}
          {showScrollBtn && (
            <TouchableOpacity style={[styles.fab, { bottom: fabBottom }]} onPress={() => scrollToLatest(true)}>
              <Icon name="arrow-down" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de entrada */}
        <View style={styles.inputWrap}>
          <View style={[styles.inputPill, { maxHeight: inputMaxH }]}>
            <TouchableOpacity style={styles.inputIconBtn}>
              <Icon name="plus" size={22} color={COLORS.subtext} />
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje"
              placeholderTextColor={COLORS.subtext}
              style={styles.input}
              multiline
              editable={!sending}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!sending && text.trim()) onSend();
              }}
            />

            <TouchableOpacity style={styles.inputIconBtn}>
              <Icon name="emoticon-outline" size={22} color={COLORS.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIconBtn}>
              <Icon name="camera-outline" size={22} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSend}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            disabled={!text.trim() || sending}
          >
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header grande
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
  },
  headerBtn: { padding: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerAvatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },

  msgTime: { fontSize: 11, marginTop: 2, marginHorizontal: 8 },

  fab: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  inputPill: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.inputBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, color: COLORS.text },
  inputIconBtn: { padding: 6 },

  sendBtn: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
