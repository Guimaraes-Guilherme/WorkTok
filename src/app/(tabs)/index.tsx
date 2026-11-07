import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, type ListViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedJobItem, FeedPostItem } from '../../components/feed';
import { Button, Empty, IconButton } from '../../components/ui';
import { fetchFeed, myLikedIds, mySavedIds, setLike, setSave } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { colors, fonts } from '../../lib/theme';
import type { FeedItem, FeedPost } from '../../lib/types';

type Mode = 'pra-voce' | 'seguindo';

export default function Feed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, profile } = useMe();
  const [mode, setMode] = useState<Mode>('pra-voce');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [height, setHeight] = useState(0);
  const [activeKey, setActiveKey] = useState<string>();
  const [focused, setFocused] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [baseLiked, setBaseLiked] = useState<Set<string>>(new Set());
  const loadingMore = useRef(false);

  const loadMarks = useCallback(
    async (list: FeedItem[]) => {
      const ids = list.filter((i) => i.type === 'post').map((i) => (i as { post: FeedPost }).post.id);
      const [l, s] = await Promise.all([myLikedIds(userId, ids), mySavedIds(userId, ids)]);
      setLiked((prev) => new Set([...prev, ...l]));
      setBaseLiked((prev) => new Set([...prev, ...l]));
      setSaved((prev) => new Set([...prev, ...s]));
    },
    [userId],
  );

  const load = useCallback(
    async (m: Mode) => {
      if (!profile) return;
      try {
        const res = await fetchFeed(m, profile);
        setItems(res.items);
        setCursor(res.cursor);
        setActiveKey(res.items[0]?.key);
        loadMarks(res.items);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile, loadMarks],
  );

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (!items.length) load(mode);
      return () => setFocused(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]),
  );

  async function loadMore() {
    if (!cursor || loadingMore.current || !profile) return;
    loadingMore.current = true;
    try {
      const res = await fetchFeed(mode, profile, cursor);
      setItems((prev) => {
        const keys = new Set(prev.map((p) => p.key));
        return [...prev, ...res.items.filter((i) => !keys.has(i.key))];
      });
      setCursor(res.cursor);
      loadMarks(res.items);
    } finally {
      loadingMore.current = false;
    }
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setLoading(true);
    setItems([]);
    load(m);
  }

  const onLike = useCallback(
    (post: FeedPost, like: boolean) => {
      setLiked((prev) => {
        const n = new Set(prev);
        if (like) n.add(post.id);
        else n.delete(post.id);
        return n;
      });
      setLike(userId, post.id, like).catch(() => {});
    },
    [userId],
  );

  const onSave = useCallback(
    (post: FeedPost, save: boolean) => {
      setSaved((prev) => {
        const n = new Set(prev);
        if (save) n.add(post.id);
        else n.delete(post.id);
        return n;
      });
      setSave(userId, post.id, save).catch(() => {});
    },
    [userId],
  );

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.item) setActiveKey((first.item as FeedItem).key);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {loading || !height ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          {mode === 'seguindo' ? (
            <Empty icon="people-outline" title="Ninguém por aqui ainda" text="Siga pessoas da sua área para ver os posts delas nesta aba." />
          ) : (
            <Empty
              icon="videocam-outline"
              title="Seja a primeira pessoa a postar"
              text="Ainda não há vídeos da sua área. Que tal mostrar sua rotina de trabalho?"
              action={<Button title="Postar agora" icon="add" style={{ marginTop: 12 }} onPress={() => router.push('/postar')} />}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={({ item }) =>
            item.type === 'post' ? (
              <FeedPostItem
                post={item.post}
                height={height}
                active={focused && activeKey === item.key}
                liked={liked.has(item.post.id)}
                baseLiked={baseLiked.has(item.post.id)}
                saved={saved.has(item.post.id)}
                onLike={onLike}
                onSave={onSave}
              />
            ) : (
              <FeedJobItem job={item.job} height={height} me={profile!} />
            )
          }
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewable}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.accent}
              onRefresh={() => {
                setRefreshing(true);
                load(mode);
              }}
            />
          }
        />
      )}

      {/* topo flutuante */}
      <View style={[styles.top, { top: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.areaPill}>
          <Text style={styles.areaText} numberOfLines={1}>
            {profile?.areas[0] ?? 'Todas'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Tab label="Seguindo" active={mode === 'seguindo'} onPress={() => switchMode('seguindo')} />
          <Tab label="Pra você" active={mode === 'pra-voce'} onPress={() => switchMode('pra-voce')} />
        </View>
        <IconButton name="search" label="Buscar" onPress={() => router.push('/busca')} />
      </View>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} hitSlop={10}>
      <Text
        style={{
          fontFamily: active ? fonts.semibold : fonts.regular,
          fontSize: 16,
          color: active ? colors.text : colors.muted,
          paddingBottom: 4,
          borderBottomWidth: 2,
          borderBottomColor: active ? colors.accent : 'transparent',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 16, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  areaPill: { height: 34, maxWidth: 110, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  areaText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
});
