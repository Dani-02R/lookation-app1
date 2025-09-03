// src/screens/ChatsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  StatusBar,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../auth/AuthProvider';
import { useChats } from '../hooks/useChats';
import { useFriendUids } from '../hooks/useFriendUids';
import { ChatConfig, type UIUser } from '../services/chat/config';
import { fetchOrCreateOneToOne } from '../services/chat';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type UiRow = {
  id: string;                 // conversationId o 'temp:<uid>'
  otherId: string;            // uid del amigo
  lastMessage?: string | null;
  isNew?: boolean;            // true si aún no existe la conversación
  updatedAt?: number | null;  // ms
  lastMessageAt?: number | null; // ms (si viene separado)
};

const COLORS = {
  primary: '#0082FA',
  success: '#16a34a',
  bg: '#FFFFFF',
  header: '#0F172A',
  text: '#111827',
  subtext: '#64748B',
  border: '#E5E7EB',
  chipBg: '#F1F5F9',
  chipText: '#0F172A',
  newBg: '#E0F2FE',
  newText: '#075985',
};

// ===== Responsividad sencilla =====
function useScale() {
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.85), 1.2);
  return (n: number) => Math.round(n * s);
}

const K_FAVORITES = 'chat:favorites:v1';
const K_LAST_READ = 'chat:lastRead:v1'; // { [conversationId]: number }

// Cache de perfiles persistente (para primera pintura instantánea)
const K_PROFILE_CACHE = 'chat:profileCache:v1';
const PROFILE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días
type ProfileCache = {
  data: Record<string, UIUser | null>;
  updatedAt: Record<string, number>; // por uid
};

// ===== Formato hora/fecha tipo WhatsApp =====
function formatWhen(ms?: number | null) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    try {
      return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(d);
    } catch {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (now.getTime() - d.getTime() < 7 * dayMs) {
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return days[d.getDay()];
  }

  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: now.getFullYear() === d.getFullYear() ? undefined : '2-digit',
    }).format(d);
  } catch {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return now.getFullYear() === d.getFullYear() ? `${dd}/${mm}` : `${dd}/${mm}/${String(d.getFullYear()).slice(-2)}`;
  }
}

/**
 * Hook: contador en vivo de no leídos en una conversación.
 * Cuenta mensajes con createdAt > lastRead y authorId != myUid.
 * Cambia 'createdAt' o 'authorId' si tu esquema usa otros nombres.
 */
function useUnreadCountLive(convId: string | null, lastReadMs: number, myUid: string | null) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!convId || convId.startsWith('temp') || !myUid) {
      setCount(0);
      return;
    }

    const base = firestore()
      .collection('conversations')
      .doc(convId)
      .collection('messages');

    // Ajusta aquí si tus campos se llaman distinto (p.e. sentAt/senderId)
    const q = base
      .where('createdAt', '>', new Date(lastReadMs || 0))
      .where('authorId', '!=', myUid);

    const unsub = q.onSnapshot(
      (snap) => setCount(snap.size),
      () => setCount(0) // silencioso si falta índice o nombres distintos
    );
    return unsub;
  }, [convId, lastReadMs, myUid]);

  return count;
}

export default function ChatsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const uid = user?.uid ?? auth().currentUser?.uid ?? null;
  const scale = useScale();

  // Conversaciones existentes
  const { items, loading } = useChats(uid);

  // UIDs de amigos aceptados
  const { uids: friendUids, loading: friendsLoading } = useFriendUids(uid);
  const friendSet = React.useMemo(() => new Set(friendUids), [friendUids]);

  // Estado UI
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState<'all' | 'unread' | 'fav'>('all');
  const [favorites, setFavorites] = React.useState<Record<string, true>>({});
  const [lastRead, setLastRead] = React.useState<Record<string, number>>({});

  // Cache persistente de perfiles
  const [profilesByUid, setProfilesByUid] = React.useState<Record<string, UIUser | null>>({});
  const cacheRef = React.useRef<ProfileCache>({ data: {}, updatedAt: {} });

  // Cargar persistencia
  React.useEffect(() => {
    (async () => {
      try {
        const [favRaw, lrRaw, profRaw] = await Promise.all([
          AsyncStorage.getItem(K_FAVORITES),
          AsyncStorage.getItem(K_LAST_READ),
          AsyncStorage.getItem(K_PROFILE_CACHE),
        ]);
        if (favRaw) setFavorites(JSON.parse(favRaw));
        if (lrRaw) setLastRead(JSON.parse(lrRaw));
        if (profRaw) {
          const parsed: ProfileCache = JSON.parse(profRaw);
          cacheRef.current = parsed;
          // pinta de inmediato lo que esté fresco
          const now = Date.now();
          const fresh: Record<string, UIUser | null> = {};
          for (const [k, v] of Object.entries(parsed.data || {})) {
            const ts = parsed.updatedAt?.[k] ?? 0;
            if (now - ts < PROFILE_TTL_MS) fresh[k] = v;
          }
          if (Object.keys(fresh).length) {
            setProfilesByUid(prev => ({ ...fresh, ...prev }));
          }
        }
      } catch {}
    })();
  }, []);

  // Construir filas (sin tocar tus hooks)
  const rows: UiRow[] = React.useMemo(() => {
    if (!uid) return [];
    const list: UiRow[] = [];

    const convByOther = new Map<
      string,
      { id: string; lastMessage?: string | null; updatedAt?: number | null; lastMessageAt?: number | null; meta?: any }
    >();

    (items || []).forEach((it: any) => {
      const other = (it?.members || []).find((m: string) => m !== uid);
      if (!other) return;

      const updated =
        typeof it?.updatedAt === 'number' ? it.updatedAt : it?.updatedAt?.toMillis?.() ?? null;

      const lastAt =
        typeof it?.lastMessageAt === 'number'
          ? it.lastMessageAt
          : it?.lastMessageAt?.toMillis?.() ?? updated;

      convByOther.set(other, {
        id: it.id,
        lastMessage: it.lastMessage ?? null,
        updatedAt: updated,
        lastMessageAt: lastAt,
        meta: it?.membersMeta?.[other] ?? null, // PERF: perfil ligero inline si existe
      });
    });

    friendUids.forEach((otherId) => {
      const existing = convByOther.get(otherId);
      if (existing) {
        list.push({
          id: existing.id,
          otherId,
          lastMessage: existing.lastMessage ?? null,
          isNew: false,
          updatedAt: existing.updatedAt ?? null,
          lastMessageAt: existing.lastMessageAt ?? null,
        });
      } else {
        list.push({
          id: `temp:${otherId}`,
          otherId,
          lastMessage: null,
          isNew: true,
          updatedAt: null,
          lastMessageAt: null,
        });
      }
    });

    // existentes primero, luego nuevos; después por uid
    return list.sort((a, b) => {
      if (a.isNew && !b.isNew) return 1;
      if (!a.isNew && b.isNew) return -1;
      return a.otherId.localeCompare(b.otherId);
    });
  }, [uid, items, friendUids]);

  // Hidratar perfiles desde membersMeta de las conversaciones (si viene)
  React.useEffect(() => {
    if (!items?.length) return;
    const quick: Record<string, UIUser | null> = {};
    (items as any[]).forEach((it: any) => {
      const other = (it?.members || []).find((m: string) => m !== uid);
      if (!other) return;
      const meta = it?.membersMeta?.[other];
      if (meta) {
        quick[other] = {
          uid: other,
          displayName: meta.displayName || 'Usuario',
          photoURL: meta.photoURL ?? null,
          username: meta.username ?? null,
        };
      }
    });
    if (Object.keys(quick).length) {
      // no pises perfiles ya cargados de red/cache
      setProfilesByUid(prev => ({ ...quick, ...prev }));
      // y si no estaban en cache persistente, guárdalos (sin caducar)
      const now = Date.now();
      const next: ProfileCache = {
        data: { ...cacheRef.current.data, ...quick },
        updatedAt: { ...cacheRef.current.updatedAt },
      };
      Object.keys(quick).forEach(uid => { if (!next.updatedAt[uid]) next.updatedAt[uid] = now; });
      cacheRef.current = next;
      AsyncStorage.setItem(K_PROFILE_CACHE, JSON.stringify(next)).catch(() => {});
    }
  }, [items, uid]);

  // Fetch de perfiles: usa cache + ChatConfig.getManyUsersByUid (solo lo que falte)
  React.useEffect(() => {
    const allUids = Array.from(new Set(rows.map(r => r.otherId)));
    if (!allUids.length) return;

    // 1) Marca lo fresco de cache persistente
    const now = Date.now();
    const freshFromCache: Record<string, UIUser | null> = {};
    const needNetwork: string[] = [];

    for (const u of allUids) {
      const inState = profilesByUid[u];
      if (inState !== undefined) continue; // ya en memoria UI

      const ts = cacheRef.current.updatedAt[u] || 0;
      const fresh = now - ts < PROFILE_TTL_MS;
      const cached = cacheRef.current.data[u];
      if (cached && fresh) {
        freshFromCache[u] = cached;
      } else {
        needNetwork.push(u);
      }
    }

    if (Object.keys(freshFromCache).length) {
      setProfilesByUid(prev => ({ ...freshFromCache, ...prev }));
    }
    if (!needNetwork.length) return;

    let cancelled = false;
    (async () => {
      try {
        const dict = await ChatConfig.getManyUsersByUid(needNetwork);
        if (cancelled) return;

        setProfilesByUid(prev => ({ ...prev, ...dict }));

        // Persiste en cache
        const stamp = Date.now();
        const next: ProfileCache = {
          data: { ...cacheRef.current.data, ...dict },
          updatedAt: { ...cacheRef.current.updatedAt },
        };
        needNetwork.forEach(u => { next.updatedAt[u] = stamp; });
        cacheRef.current = next;
        AsyncStorage.setItem(K_PROFILE_CACHE, JSON.stringify(next)).catch(() => {});
      } catch {
        // Evita loops
        const fallback = Object.fromEntries(needNetwork.map(u => [u, null]));
        setProfilesByUid(prev => ({ ...prev, ...fallback }));
      }
    })();

    return () => { /* cleanup */ cancelled = true; };
  }, [rows, profilesByUid]);

  // Prefetch de amigos en background para tener cache “calentito”
  React.useEffect(() => {
    if (!friendUids?.length) return;
    (async () => {
      try {
        const unknown = friendUids.filter(u => !(u in cacheRef.current.data));
        if (!unknown.length) return;
        const dict = await ChatConfig.getManyUsersByUid(unknown);
        const now = Date.now();
        const next: ProfileCache = {
          data: { ...cacheRef.current.data, ...dict },
          updatedAt: { ...cacheRef.current.updatedAt },
        };
        unknown.forEach(u => { next.updatedAt[u] = now; });
        cacheRef.current = next;
        AsyncStorage.setItem(K_PROFILE_CACHE, JSON.stringify(next)).catch(() => {});
        // No fuerzas render si no estás en pantalla; pero aquí sí ayuda:
        setProfilesByUid(prev => ({ ...prev, ...dict }));
      } catch {}
    })();
  }, [friendUids]);

  // helpers UI
  const isFav = React.useCallback((id: string) => !!favorites[id], [favorites]);
  const toggleFav = React.useCallback((id: string) => {
    setFavorites(prev => {
      const nxt = { ...prev };
      if (nxt[id]) delete nxt[id]; else nxt[id] = true;
      AsyncStorage.setItem(K_FAVORITES, JSON.stringify(nxt)).catch(() => {});
      return nxt;
    });
  }, []);

  const normalized = (s: string) =>
    (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  // Para el tab "No leídos" usamos un filtro aproximado: updatedAt > lastRead
  const approxHasUnread = React.useCallback(
    (r: UiRow) => !!r.updatedAt && (r.updatedAt > (lastRead[r.id] ?? 0)),
    [lastRead]
  );

  const filtered = React.useMemo(() => {
    const q = normalized(query);
    return rows.filter(r => {
      if (tab === 'fav' && !isFav(r.id)) return false;
      if (tab === 'unread' && !approxHasUnread(r)) return false;
      if (!q) return true;
      const other = profilesByUid[r.otherId];
      const title = other?.username ?? other?.displayName ?? '';
      const hay = normalized(`${title} ${r.lastMessage ?? ''} ${r.otherId}`);
      return hay.includes(q);
    });
  }, [rows, profilesByUid, query, tab, isFav, approxHasUnread]);

  const navigationOpen = async (row: UiRow) => {
    try {
      if (!uid) return;
      if (!friendSet.has(row.otherId)) {
        Alert.alert('Amigos', 'Solo puedes chatear con tus amigos aceptados.');
        return;
      }
      let conversationId = row.id;
      if (row.isNew) {
        conversationId = await fetchOrCreateOneToOne(uid, row.otherId);
      }
      // marcar leído localmente
      const next = { ...lastRead, [conversationId]: Date.now() };
      await AsyncStorage.setItem(K_LAST_READ, JSON.stringify(next));
      setLastRead(next);

      const params: RootStackParamList['ChatRoom'] = { conversationId, otherId: row.otherId };
      navigation.navigate('ChatRoom', params);
    } catch (e: any) {
      let msg = e?.message ?? 'No se pudo abrir el chat.';
      if (e?.code === 'permission-denied') msg = 'Permiso denegado. Revisa reglas e inicio de sesión.';
      else if (e?.code === 'failed-precondition') msg = 'Falta índice (members + updatedAt) en Firestore.';
      Alert.alert('Error', msg);
    }
  };

  if (loading || friendsLoading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }
  if (!uid) {
    return <View style={styles.centerPad}><Text style={styles.emptyText}>Inicia sesión para ver y crear chats.</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: Platform.OS === 'ios' ? 8 : 4 }]}>
        <Text style={styles.headerTitle}>Chats</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar o empezar chat"
            placeholderTextColor={COLORS.subtext}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips */}
        <View style={styles.chipsRow}>
          <Chip label="Todos" active={tab === 'all'} onPress={() => setTab('all')} />
          <Chip label="No leídos" active={tab === 'unread'} onPress={() => setTab('unread')} />
          <Chip label="Favoritos" active={tab === 'fav'} onPress={() => setTab('fav')} />
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const other = profilesByUid[item.otherId] ?? null;
          const lastTime = formatWhen(item.lastMessageAt ?? item.updatedAt);
          const lastReadMs = lastRead[item.id] ?? 0;
          return (
            <ChatRowMemo
              row={item}
              other={other}
              lastReadMs={lastReadMs}
              myUid={uid}
              onPress={() => navigationOpen(item)}
              isFavorite={isFav(item.id)}
              onToggleFavorite={() => toggleFav(item.id)}
              lastTime={lastTime}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {query || tab !== 'all' ? 'Sin resultados.' : 'Agrega amigos para comenzar a chatear.'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

/** === ChatRow: usa hooks adentro y está memorizado === */
function ChatRow({
  row,
  other,
  onPress,
  isFavorite,
  onToggleFavorite,
  lastTime,
  lastReadMs,
  myUid,
}: {
  row: UiRow;
  other: UIUser | null;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  lastTime: string;
  lastReadMs: number;
  myUid: string | null;
}) {
  // Hook en componente: OK ✅
  const unreadCount = useUnreadCountLive(row.isNew ? null : row.id, lastReadMs, myUid);
  const hasUnread = unreadCount > 0;

  const title =
    other?.username ??
    other?.displayName ??
    '...';

  const subtitle = row.isNew ? 'Nuevo chat' : (row.lastMessage || '');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.row}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {other?.photoURL ? (
          <Image source={{ uri: other.photoURL }} style={styles.avatar} />
        ) : (
          <Icon name="account-circle" size={48} color={COLORS.primary} />
        )}
      </View>

      {/* Centro: nombre + última línea */}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, hasUnread && { fontWeight: '800' }]} numberOfLines={1}>
            {title}
          </Text>

          {!!lastTime && (
            <Text style={[styles.timeText, hasUnread && { color: COLORS.success, fontWeight: '700' }]}>
              {lastTime}
            </Text>
          )}
        </View>

        {!!subtitle && (
          <Text
            style={[styles.rowSubtitle, hasUnread && { fontWeight: '700' }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Derecha: estrella + badge */}
      <View style={styles.rightCol}>
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? COLORS.primary : COLORS.subtext}
          />
        </TouchableOpacity>

        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
const ChatRowMemo = React.memo(ChatRow);

function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.chip, active && { backgroundColor: COLORS.primary + '1A', borderColor: COLORS.primary }]}
    >
      <Text style={[styles.chipText, active && { color: COLORS.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerPad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  emptyText: { textAlign: 'center', color: COLORS.subtext, padding: 16 },

  headerWrap: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: COLORS.bg },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.header, marginBottom: 12 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { marginLeft: 8, flex: 1, paddingVertical: 8, color: COLORS.text },

  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.chipBg, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { color: COLORS.chipText, fontWeight: '600' },

  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 72 },

  row: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg },
  avatarWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },

  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '700' },
  timeText: { marginLeft: 8, color: COLORS.subtext, fontSize: 12, minWidth: 56, textAlign: 'right' },
  rowSubtitle: { marginTop: 2, color: COLORS.subtext, fontSize: 13 },

  rightCol: { alignItems: 'flex-end', justifyContent: 'space-between', height: 46, paddingVertical: 2, marginLeft: 8 },
  unreadBadge: {
    marginTop: 6, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  badgeNew: {
    paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: COLORS.newBg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BAE6FD',
  },
  badgeNewText: { fontSize: 11, fontWeight: '700', color: COLORS.newText },
});
