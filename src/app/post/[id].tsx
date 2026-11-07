import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedPostItem } from '../../components/feed';
import { IconButton, Loading } from '../../components/ui';
import { myLikedIds, mySavedIds, setLike, setSave } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { friendlyError, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import type { FeedPost } from '../../lib/types';

/** Abre um post sozinho em tela cheia (vindo do perfil ou da busca) */
export default function PostDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useMe();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [height, setHeight] = useState(0);
  const [liked, setLiked] = useState(false);
  const [baseLiked, setBaseLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('feed_posts').select('*').eq('id', id).single();
      if (!data) return router.back();
      setPost(data as FeedPost);
      const [l, s] = await Promise.all([myLikedIds(userId, [id]), mySavedIds(userId, [id])]);
      setLiked(l.has(id));
      setBaseLiked(l.has(id));
      setSaved(s.has(id));
    })();
  }, [id, userId, router]);

  async function remove() {
    Alert.alert('Apagar publicação?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('posts').delete().eq('id', id);
          if (error) Alert.alert('Erro', friendlyError(error));
          else router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {!post || !height ? (
        <Loading />
      ) : (
        <FeedPostItem
          post={post}
          height={height}
          active
          liked={liked}
          baseLiked={baseLiked}
          saved={saved}
          onLike={(p, v) => {
            setLiked(v);
            setLike(userId, p.id, v).catch(() => setLiked(!v));
          }}
          onSave={(p, v) => {
            setSaved(v);
            setSave(userId, p.id, v).catch(() => setSaved(!v));
          }}
        />
      )}
      <View style={{ position: 'absolute', top: insets.top + 6, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} bg="rgba(0,0,0,0.35)" />
        {post?.author_id === userId && <IconButton name="trash-outline" label="Apagar publicação" onPress={remove} bg="rgba(0,0,0,0.35)" />}
      </View>
    </View>
  );
}
