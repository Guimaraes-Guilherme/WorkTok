import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  canStartChat,
  fetchLikedPosts,
  fetchPresentations,
  fetchProfile,
  fetchSavedPosts,
  fetchStats,
  fetchUserPosts,
  isFollowing,
  setFollow,
  startConversation,
} from '../lib/api';
import { useMe } from '../lib/auth';
import { compactNumber, duration } from '../lib/format';
import { friendlyError, supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import { isRecruiter, type FeedPost, type PresentationVideo, type Profile } from '../lib/types';
import { PostGrid } from './lists';
import { Avatar, Button, Chip, Empty, IconButton, Loading, T } from './ui';

type Tab = 'posts' | 'salvos' | 'curtidos';
const SLOT_HINTS = ['Quem sou eu', 'Minhas skills', 'Meus projetos'];

export function ProfileView({ id, showBack }: { id: string; showBack?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, profile: me, refreshProfile } = useMe();
  const own = id === userId;

  const [profile, setProfile] = useState<Profile | null>(own ? me : null);
  const [stats, setStats] = useState({ following: 0, followers: 0, likes: 0 });
  const [presentations, setPresentations] = useState<PresentationVideo[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [following, setFollowingState] = useState(false);
  const [chatAllowed, setChatAllowed] = useState(false);
  const [playing, setPlaying] = useState<PresentationVideo | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTab = useCallback(
    async (t: Tab) => {
      const list = t === 'posts' ? await fetchUserPosts(id) : t === 'salvos' ? await fetchSavedPosts(userId) : await fetchLikedPosts(userId);
      setPosts(list);
    },
    [id, userId],
  );

  const load = useCallback(async () => {
    try {
      const [p, s, pres] = await Promise.all([own ? Promise.resolve(me) : fetchProfile(id), fetchStats(id), fetchPresentations(id)]);
      setProfile(p);
      setStats(s);
      setPresentations(pres);
      if (!own) {
        const [f, c] = await Promise.all([isFollowing(userId, id), canStartChat(userId, id)]);
        setFollowingState(f);
        setChatAllowed(c);
      }
      await loadTab(tab);
    } catch (e) {
      Alert.alert('Erro ao carregar perfil', friendlyError(e));
    }
  }, [id, own, me, userId, tab, loadTab]);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, me]),
  );

  async function toggleFollow() {
    const next = !following;
    setFollowingState(next);
    setStats((s) => ({ ...s, followers: s.followers + (next ? 1 : -1) }));
    try {
      await setFollow(userId, id, next);
      setChatAllowed(await canStartChat(userId, id));
    } catch (e) {
      setFollowingState(!next);
      Alert.alert('Erro', friendlyError(e));
    }
  }

  async function message() {
    if (!chatAllowed) {
      return Alert.alert(
        'Conversa indisponível',
        'Vocês precisam se seguir para conversar. Recrutadores e empresas podem iniciar contato com qualquer pessoa.',
      );
    }
    setBusy(true);
    try {
      const conv = await startConversation(id);
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function slotOptions(v: PresentationVideo) {
    const replace = () => router.push({ pathname: '/novo/apresentacao', params: { slot: String(v.slot) } });
    const remove = async () => {
      await supabase.from('presentation_videos').delete().eq('user_id', userId).eq('slot', v.slot);
      setPresentations((list) => list.filter((x) => x.slot !== v.slot));
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Assistir', 'Substituir vídeo', 'Remover', 'Cancelar'], destructiveButtonIndex: 2, cancelButtonIndex: 3 },
        (i) => (i === 0 ? setPlaying(v) : i === 1 ? replace() : i === 2 ? remove() : null),
      );
    } else {
      Alert.alert(v.title || `Apresentação ${v.slot}`, undefined, [
        { text: 'Assistir', onPress: () => setPlaying(v) },
        { text: 'Substituir', onPress: replace },
        { text: 'Remover', style: 'destructive', onPress: remove },
      ]);
    }
  }

  async function signOutConfirm() {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (!profile) return <Loading />;
  const name = profile.full_name || profile.username;
  const recruiterViewing = !own && isRecruiter(me);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* topo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 52 }}>
        {showBack ? <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} /> : <View style={{ width: 12 }} />}
        <T v="title" style={{ fontSize: 18, flex: 1, textAlign: showBack ? 'center' : 'left' }}>@{profile.username}</T>
        {own ? (
          <IconButton name="log-out-outline" label="Sair" onPress={signOutConfirm} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            tintColor={colors.accent}
            onRefresh={async () => {
              if (own) await refreshProfile();
              load();
            }}
          />
        }
      >
        {/* identidade */}
        <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 8 }}>
          <Avatar url={profile.avatar_url} name={name} size={92} />
          <T v="title" style={{ fontSize: 24, textAlign: 'center' }}>{name}</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {!!profile.headline && (
              <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.accentText }}>{profile.headline}</Text>
              </View>
            )}
            {isRecruiter(profile) && (
              <View style={{ backgroundColor: colors.violet, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.accentText }}>
                  {profile.account_type === 'empresa' ? 'Empresa' : 'Recrutador/RH'}
                </Text>
              </View>
            )}
          </View>
          {profile.open_to_work && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
              <T v="small" style={{ color: colors.textSoft }}>Aberto(a) a oportunidades</T>
            </View>
          )}
          {!!profile.bio && <T style={{ textAlign: 'center', color: colors.textSoft, fontSize: 14, lineHeight: 21 }}>{profile.bio}</T>}
        </View>

        {/* números */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 36, marginTop: 18 }}>
          <Stat n={stats.following} label="Seguindo" />
          <Stat n={stats.followers} label="Seguidores" />
          <Stat n={stats.likes} label="Curtidas" />
        </View>

        {/* ações */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 }}>
          {own ? (
            <>
              <Button title="Editar perfil" kind="dark" height={44} style={{ flex: 1 }} onPress={() => router.push('/editar-perfil')} />
              <Button title="Postar" kind="dark" height={44} style={{ flex: 1 }} onPress={() => router.push('/postar')} />
            </>
          ) : (
            <>
              <Button title={following ? 'Seguindo' : 'Seguir'} kind={following ? 'dark' : 'primary'} height={44} style={{ flex: 1 }} onPress={toggleFollow} />
              <Button
                title={recruiterViewing ? 'Entrar em contato' : 'Mensagem'}
                kind="dark"
                height={44}
                style={{ flex: 1, opacity: chatAllowed ? 1 : 0.5 }}
                onPress={message}
                loading={busy}
              />
            </>
          )}
        </View>

        {/* skills */}
        {profile.skills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20, marginTop: 16 }}>
            {profile.skills.map((s) => (
              <Chip key={s} small label={s} />
            ))}
          </View>
        )}

        {/* caixa de apresentação */}
        <View style={{ marginHorizontal: 16, marginTop: 22, padding: 16, borderRadius: 22, backgroundColor: '#14141A', borderWidth: 1, borderColor: '#2A2A34', gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <T v="title" style={{ fontSize: 17 }}>Apresentação</T>
              <T v="small" style={{ fontSize: 12 }}>
                {own ? '3 vídeos de até 3 min · fixados no topo' : `Conheça ${name.split(' ')[0]} em vídeo`}
              </T>
            </View>
            {own && <T v="small" style={{ color: colors.accent, fontFamily: fonts.semibold, fontSize: 12 }}>{presentations.length} de 3</T>}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3].map((slot) => {
              const v = presentations.find((p) => p.slot === slot);
              if (v) {
                return (
                  <View key={slot} style={{ flex: 1, gap: 6 }}>
                    <Pressable
                      onPress={() => (own ? slotOptions(v) : setPlaying(v))}
                      accessibilityLabel={`Assistir ${v.title || 'apresentação'}`}
                      style={{ height: 150, borderRadius: 14, backgroundColor: slot === 2 ? colors.violet : '#2A2A36', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="play" size={26} color={slot === 2 ? colors.bg : colors.text} />
                      <View style={{ position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(11,11,15,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 11 }}>{duration(v.duration_seconds)}</Text>
                      </View>
                    </Pressable>
                    <T v="strong" numberOfLines={1} style={{ fontSize: 13 }}>{v.title || SLOT_HINTS[slot - 1]}</T>
                  </View>
                );
              }
              if (!own) {
                return (
                  <View key={slot} style={{ flex: 1, gap: 6 }}>
                    <View style={{ height: 150, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3A3A46' }} />
                    <T v="small" style={{ fontSize: 13 }}> </T>
                  </View>
                );
              }
              return (
                <View key={slot} style={{ flex: 1, gap: 6 }}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/novo/apresentacao', params: { slot: String(slot) } })}
                    accessibilityLabel={`Gravar apresentação ${slot}`}
                    style={{ height: 150, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3A3A46', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="add" size={20} color={colors.accentText} />
                    </View>
                    <T v="small" style={{ fontSize: 12 }}>Gravar</T>
                  </Pressable>
                  <T v="small" numberOfLines={1} style={{ fontSize: 13 }}>{SLOT_HINTS[slot - 1]}</T>
                </View>
              );
            })}
          </View>
        </View>

        {/* abas */}
        <View style={{ flexDirection: 'row', marginTop: 22, borderBottomWidth: 1, borderBottomColor: '#1F1F27' }}>
          {(own ? (['posts', 'salvos', 'curtidos'] as Tab[]) : (['posts'] as Tab[])).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setTab(t);
                loadTab(t);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              style={{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? colors.text : 'transparent' }}
            >
              <Text style={{ fontFamily: tab === t ? fonts.semibold : fonts.medium, fontSize: 14, color: tab === t ? colors.text : colors.muted }}>
                {t === 'posts' ? 'Publicações' : t === 'salvos' ? 'Salvos' : 'Curtidos'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingTop: 2 }}>
          {posts.length ? (
            <PostGrid posts={posts} />
          ) : (
            <Empty
              icon={tab === 'posts' ? 'grid-outline' : tab === 'salvos' ? 'bookmark-outline' : 'heart-outline'}
              title={tab === 'posts' ? (own ? 'Você ainda não postou' : 'Nenhuma publicação ainda') : 'Nada por aqui ainda'}
            />
          )}
        </View>
      </ScrollView>

      <PresentationPlayer video={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <T v="strong" style={{ fontSize: 18 }}>{compactNumber(n)}</T>
      <T v="small">{label}</T>
    </View>
  );
}

function PresentationPlayer({ video, onClose }: { video: PresentationVideo | null; onClose: () => void }) {
  return (
    <Modal visible={!!video} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {video && <PlayerBody video={video} onClose={onClose} />}
    </Modal>
  );
}

function PlayerBody({ video, onClose }: { video: PresentationVideo; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(video.video_url, (p) => p.play());
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton name="close" label="Fechar" onPress={onClose} bg="rgba(0,0,0,0.5)" />
        <T v="strong">{video.title}</T>
      </View>
    </View>
  );
}
