// src/screens/FriendsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFriends } from '../hooks/useFriends';
import { sendFriendRequest, respondFriendRequest } from '../services/friends';
import { searchUsernames } from '../services/usernames';
import { fetchOrCreateOneToOne } from '../services/chat';
import { ChatConfig, type UIUser } from '../services/chat/config';
import { useAfterInteractions } from '../hooks/useAfterInteractions';
import { useChats } from '../hooks/useChats';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  primary: '#0082FA',
  success: '#22C55E',
  danger: '#EF4444',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  subtext: '#64748B',
};

const K_PROFILE_CACHE = 'chat:profileCache:v1';
const PROFILE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

type ProfileCache = {
  data: Record<string, UIUser | null>;
  updatedAt: Record<string, number>;
};

type TabKey = 'buscar' | 'incoming' | 'outgoing' | 'friends';

export default function FriendsScreen() {
  const navigation = useNavigation<Nav>();
  const myUid = auth().currentUser?.uid ?? null;

  // Amigos/solicitudes
  const { incoming, outgoing, friends, loading } = useFriends(myUid);
  // Conversaciones (para encontrar la existente al abrir chat desde Amigos)
  const { items: convs } = useChats(myUid);

  // pestañas
  const [tab, setTab] = React.useState<TabKey>('buscar');

  // búsqueda de usuarios
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Array<{ tag: string; uid: string }>>([]);
  const [searching, setSearching] = React.useState(false);

  // búsqueda dentro de “Amigos”
  const [friendsQuery, setFriendsQuery] = React.useState('');

  // perfiles cacheados
  const [profilesByUid, setProfilesByUid] = React.useState<Record<string, UIUser | null>>({});
  const cacheRef = React.useRef<ProfileCache>({ data: {}, updatedAt: {} });

  // transiciones no bloqueantes
  const [_, startTransition] = React.useTransition();

  // sets auxiliares
  const pendingOutgoingUids = React.useMemo(() => new Set(outgoing.map(r => r.to)), [outgoing]);
  const pendingIncomingUids = React.useMemo(() => new Set(incoming.map(r => r.from)), [incoming]);
  const friendUids = React.useMemo(() => {
    const s = new Set<string>();
    friends.forEach(r => {
      const other = r.members?.find?.((m: string) => m !== myUid);
      if (other) s.add(other);
    });
    return s;
  }, [friends, myUid]);

  // Mapa friend→conversationId existente (para NO crear chats vacíos)
  const convIdByFriend = React.useMemo(() => {
    const m = new Map<string, string>();
    (convs || []).forEach((c: any) => {
      const members: string[] = Array.isArray(c?.members) ? c.members : [];
      if (!myUid) return;
      if (members.length >= 2 && members.includes(myUid)) {
        const other = members.find(u => u !== myUid);
        if (other) m.set(other, c.id);
      }
    });
    return m;
  }, [convs, myUid]);

  // Carga cache persistente DESPUÉS de las animaciones
  useAfterInteractions(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(K_PROFILE_CACHE);
        if (!raw) return;
        const parsed: ProfileCache = JSON.parse(raw);
        cacheRef.current = parsed;
        const now = Date.now();
        const fresh: Record<string, UIUser | null> = {};
        for (const [uid, u] of Object.entries(parsed.data || {})) {
          const ts = parsed.updatedAt?.[uid] ?? 0;
          if (now - ts < PROFILE_TTL_MS) fresh[uid] = u;
        }
        if (Object.keys(fresh).length) {
          startTransition(() => setProfilesByUid(prev => ({ ...fresh, ...prev })));
        }
      } catch {}
    })();
  }, []);

  // Debounce de búsqueda de usuarios
  React.useEffect(() => {
    if (tab !== 'buscar') return; // solo buscar en esa pestaña
    const q = query.trim().replace(/^@/, '').toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const rows = await searchUsernames(q, 10);
        // dedupe por uid
        const uniq = Array.from(new Map(rows.map(r => [r.uid, r])).values());
        setResults(uniq);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, tab]);

  // UIDs necesarios (prefetch perfiles)
  const neededUids = React.useMemo(() => {
    const s = new Set<string>();
    incoming.forEach(it => s.add(it.from));
    outgoing.forEach(it => s.add(it.to));
    friends.forEach(fr => {
      const other = fr.members?.find?.((m: string) => m !== myUid);
      if (other) s.add(other);
    });
    results.forEach(r => s.add(r.uid));
    return Array.from(s);
  }, [incoming, outgoing, friends, results, myUid]);

  // Prefetch de perfiles (cache → red)
  useAfterInteractions(() => {
    if (!neededUids.length) return;

    const now = Date.now();
    const freshFromCache: Record<string, UIUser | null> = {};
    const needNetwork: string[] = [];

    for (const uid of neededUids) {
      if (profilesByUid[uid] !== undefined) continue;
      const ts = cacheRef.current.updatedAt[uid] || 0;
      const fresh = now - ts < PROFILE_TTL_MS;
      const cached = cacheRef.current.data[uid];
      if (cached && fresh) freshFromCache[uid] = cached;
      else needNetwork.push(uid);
    }

    if (Object.keys(freshFromCache).length) {
      startTransition(() => setProfilesByUid(prev => ({ ...freshFromCache, ...prev })));
    }
    if (!needNetwork.length) return;

    let cancelled = false;
    (async () => {
      try {
        const dict = await ChatConfig.getManyUsersByUid(needNetwork);
        if (cancelled) return;
        startTransition(() => setProfilesByUid(prev => ({ ...prev, ...dict })));

        const stamp = Date.now();
        const next: ProfileCache = {
          data: { ...cacheRef.current.data, ...dict },
          updatedAt: { ...cacheRef.current.updatedAt },
        };
        needNetwork.forEach(u => { next.updatedAt[u] = stamp; });
        cacheRef.current = next;
        AsyncStorage.setItem(K_PROFILE_CACHE, JSON.stringify(next)).catch(() => {});
      } catch {
        const fallback = Object.fromEntries(needNetwork.map(u => [u, null]));
        startTransition(() => setProfilesByUid(prev => ({ ...prev, ...fallback })));
      }
    })();

    return () => { cancelled = true; };
  }, [neededUids, profilesByUid]);

  // === acciones ===
  const sendReqTo = React.useCallback(async (otherUid: string) => {
    try {
      if (!myUid) return Alert.alert('Sesión', 'Inicia sesión primero.');
      if (otherUid === myUid) return Alert.alert('Atención', 'No puedes agregarte a ti mismo.');
      if (friendUids.has(otherUid)) return Alert.alert('Info', 'Ya son amigos.');
      if (pendingOutgoingUids.has(otherUid)) return Alert.alert('Info', 'Solicitud ya enviada.');
      if (pendingIncomingUids.has(otherUid)) return Alert.alert('Info', 'Tienes una solicitud de esa persona.');

      await sendFriendRequest(myUid, otherUid);
      Alert.alert('Listo', 'Solicitud enviada.');
      setQuery('');
      setResults([]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar la solicitud.');
    }
  }, [myUid, friendUids, pendingIncomingUids, pendingOutgoingUids]);

  const accept = React.useCallback(async (id: string) => {
    try {
      await respondFriendRequest(id, true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo aceptar.');
    }
  }, []);

  const reject = React.useCallback(async (id: string) => {
    try {
      await respondFriendRequest(id, false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo rechazar.');
    }
  }, []);

  // Cancelar (intenta cancelFriendRequest si existe; si no, responde false)
  const cancelOutgoing = React.useCallback(async (id: string) => {
    try {
      let didCustom = false;
      try {
        const mod: any = await import('../services/friends');
        if (typeof mod.cancelFriendRequest === 'function') {
          await mod.cancelFriendRequest(id);
          didCustom = true;
        }
      } catch {}
      if (!didCustom) await respondFriendRequest(id, false as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cancelar la solicitud.');
    }
  }, []);

  // Abre chat usando conversación existente si la hay; si no, crea
  const openChat = React.useCallback(async (otherUid: string) => {
    try {
      if (!myUid) return;
      if (!friendUids.has(otherUid)) {
        Alert.alert('Amigos', 'Solo puedes chatear con tus amigos aceptados.');
        return;
      }

      const existing = convIdByFriend.get(otherUid);
      const cid = existing ?? (await fetchOrCreateOneToOne(myUid, otherUid));

      const params: RootStackParamList['ChatRoom'] = { conversationId: cid, otherId: otherUid };
      navigation.navigate('ChatRoom', params);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir el chat');
    }
  }, [navigation, myUid, friendUids, convIdByFriend]);

  // === UI components ===
  const TabBar = () => (
    <View style={styles.tabBar}>
      <TabBtn label="Buscar"      active={tab === 'buscar'}   onPress={() => setTab('buscar')} />
      <TabBtn label="Solicitudes" active={tab === 'incoming'} onPress={() => setTab('incoming')} />
      <TabBtn label="Enviadas"    active={tab === 'outgoing'} onPress={() => setTab('outgoing')} />
      <TabBtn label="Amigos"      active={tab === 'friends'}  onPress={() => setTab('friends')} />
    </View>
  );

  const TabBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SkeletonRow = () => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={styles.skelAvatar} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <View style={styles.skelLineWide} />
          <View style={[styles.skelLineNarrow, { marginTop: 6 }]} />
        </View>
      </View>
      <View style={styles.skelBtn} />
    </View>
  );

  const FriendRow = React.useMemo(
    () =>
      React.memo(function FriendRowInner({
        user,
        hintTag,
        right,
        onPress,
      }: {
        user: UIUser | null | undefined;
        hintTag?: string | null;
        right?: React.ReactNode;
        onPress?: () => void;
      }) {
        const title = user?.displayName || hintTag || 'Usuario';
        const handle = user?.username || hintTag || null;
        const photoURL = user?.photoURL ?? null;

        return (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.8 : 1}
            style={styles.card}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <Icon name="account-circle" size={44} color={COLORS.primary} />
              )}
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {handle ? <Text style={styles.subtitle} numberOfLines={1}>{handle}</Text> : null}
              </View>
            </View>
            {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
          </TouchableOpacity>
        );
      }),
    []
  );

  // === Datos por pestaña (dedupe y claves únicas) ===
  const dataBuscar = React.useMemo(
    () => results.map(r => ({ kind: 'result' as const, id: `result:${r.uid}`, uid: r.uid, tag: r.tag })),
    [results]
  );
  const dataIncoming = React.useMemo(
    () => Array.from(new Map(incoming.map(it => [it.id, it])).values())
               .map(it => ({ kind: 'incoming' as const, id: it.id, from: it.from })),
    [incoming]
  );
  const dataOutgoing = React.useMemo(
    () => Array.from(new Map(outgoing.map(it => [it.id, it])).values())
               .map(it => ({ kind: 'outgoing' as const, id: it.id, to: it.to })),
    [outgoing]
  );
  const dataFriendsRaw = React.useMemo(
    () => friends.map(fr => {
      const otherUid = fr.members.find((m: string) => m !== myUid)!;
      return { kind: 'friend' as const, id: fr.id, otherUid };
    }),
    [friends, myUid]
  );

  // Filtro de “Amigos”
  const normalized = (s: string) =>
    (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const dataFriends = React.useMemo(() => {
    const q = normalized(friendsQuery);
    if (!q) return dataFriendsRaw;
    return dataFriendsRaw.filter(it => {
      const u = profilesByUid[it.otherUid];
      const title = u?.displayName || '';
      const handle = u?.username || '';
      const hay = normalized(`${title} ${handle} ${it.otherUid}`);
      return hay.includes(q);
    });
  }, [dataFriendsRaw, friendsQuery, profilesByUid]);

  const currentData =
    tab === 'buscar' ? dataBuscar
      : tab === 'incoming' ? dataIncoming
      : tab === 'outgoing' ? dataOutgoing
      : dataFriends;

  // === Header de cada pestaña ===
  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <Text style={styles.headerTitle}>Amigos</Text>
      <View style={styles.tabBar}>
        <TabBtn label="Buscar"      active={tab === 'buscar'}   onPress={() => setTab('buscar')} />
        <TabBtn label="Solicitudes" active={tab === 'incoming'} onPress={() => setTab('incoming')} />
        <TabBtn label="Enviadas"    active={tab === 'outgoing'} onPress={() => setTab('outgoing')} />
        <TabBtn label="Amigos"      active={tab === 'friends'}  onPress={() => setTab('friends')} />
      </View>

      {tab === 'buscar' && (
        <View style={styles.searchBar}>
          <Icon name="account-search-outline" size={20} color={COLORS.subtext} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="@usuario"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            placeholderTextColor={COLORS.subtext}
          />
          {searching ? <ActivityIndicator size="small" /> : null}
          {!!query && !searching && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {tab === 'friends' && (
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={COLORS.subtext} />
          <TextInput
            value={friendsQuery}
            onChangeText={setFriendsQuery}
            placeholder="Buscar en tus amigos"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            placeholderTextColor={COLORS.subtext}
          />
          {!!friendsQuery && (
            <TouchableOpacity onPress={() => setFriendsQuery('')}>
              <Icon name="close-circle" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // === Render rows ===
  const renderItem = ({ item }: { item: any }) => {
    switch (item.kind) {
      case 'result': {
        const disabled =
          !myUid ||
          item.uid === myUid ||
          friendUids.has(item.uid) ||
          pendingOutgoingUids.has(item.uid) ||
          pendingIncomingUids.has(item.uid);

        const label = friendUids.has(item.uid)
          ? 'Amigos'
          : pendingOutgoingUids.has(item.uid)
          ? 'Enviada'
          : pendingIncomingUids.has(item.uid)
          ? 'Te envió'
          : 'Agregar';

        const u = profilesByUid[item.uid];
        if (tab === 'buscar' && searching && !u) return <SkeletonRow />;

        return (
          <FriendRow
            user={u}
            hintTag={`@${item.tag}`}
            right={
              <TouchableOpacity
                onPress={() => !disabled && sendReqTo(item.uid)}
                disabled={disabled}
                style={[
                  styles.actionBtn,
                  { backgroundColor: disabled ? '#94a3b8' : COLORS.primary },
                ]}
              >
                <Text style={styles.actionBtnText}>{label}</Text>
              </TouchableOpacity>
            }
          />
        );
      }
      case 'incoming': {
        const u = profilesByUid[item.from];
        if (!u) return <SkeletonRow />;
        return (
          <FriendRow
            user={u}
            right={
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => accept(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.success, marginRight: 8 }]}>
                  <Text style={styles.actionBtnText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reject(item.id)} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
                  <Text style={styles.actionBtnText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            }
          />
        );
      }
      case 'outgoing': {
        const u = profilesByUid[item.to];
        if (!u) return <SkeletonRow />;
        return (
          <FriendRow
            user={u}
            right={
              <TouchableOpacity
                onPress={() => cancelOutgoing(item.id)}
                style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
              >
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            }
          />
        );
      }
      case 'friend': {
        const u = profilesByUid[item.otherUid];
        if (!u) return <SkeletonRow />;
        return (
          <FriendRow
            user={u}
            onPress={() => openChat(item.otherUid)}
            right={
              <TouchableOpacity onPress={() => openChat(item.otherUid)} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.actionBtnText}>Mensaje</Text>
              </TouchableOpacity>
            }
          />
        );
      }
      default:
        return null;
    }
  };

  const keyExtractor = (it: any, idx: number) => {
    switch (it.kind) {
      case 'result': return it.id;            // result:uid
      case 'incoming': return `incoming:${it.id}`;
      case 'outgoing': return `outgoing:${it.id}`;
      case 'friend': return `friend:${it.id}`;
      default: return `${idx}`;
    }
  };

  const Empty = () => {
    if (loading) return null;
    const text =
      tab === 'buscar'
        ? (query.trim() ? (searching ? 'Buscando…' : 'Sin resultados') : 'Escribe para buscar por @usuario')
        : tab === 'incoming'
        ? 'No tienes solicitudes nuevas'
        : tab === 'outgoing'
        ? 'No has enviado solicitudes'
        : (friendsQuery.trim() ? 'Ningún amigo coincide con tu búsqueda' : 'Aún no tienes amigos');

    return <Text style={styles.emptyText}>{text}</Text>;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: COLORS.subtext }}>Cargando…</Text>
      </View>
    );
  }

  if (!myUid) {
    return (
      <View style={styles.centerPad}>
        <Text style={{ color: COLORS.subtext, textAlign: 'center' }}>
          Inicia sesión para gestionar amigos.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FlatList
        data={currentData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={Empty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  centerPad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: COLORS.bg },

  headerWrap: { paddingTop: 8, paddingBottom: 12, backgroundColor: COLORS.bg },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 12 },

  tabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { marginLeft: 8, flex: 1, paddingVertical: Platform.OS === 'ios' ? 10 : 6, color: COLORS.text },

  emptyText: { color: COLORS.subtext, textAlign: 'left', marginVertical: 12 },

  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  avatar: { width: 44, height: 44, borderRadius: 22 },

  title: { fontWeight: '800', color: COLORS.text, fontSize: 15 },
  subtitle: { color: COLORS.subtext, fontSize: 13, marginTop: 2 },

  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  actionBtnText: { color: '#fff', fontWeight: '800' },

  // skeletons
  skelAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9EEF5' },
  skelLineWide: { width: 160, height: 12, backgroundColor: '#E9EEF5', borderRadius: 6 },
  skelLineNarrow: { width: 100, height: 10, backgroundColor: '#E9EEF5', borderRadius: 5 },
  skelBtn: { width: 96, height: 32, backgroundColor: '#E9EEF5', borderRadius: 8, alignSelf: 'flex-end' },
});
