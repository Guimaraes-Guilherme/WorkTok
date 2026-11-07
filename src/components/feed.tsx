import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { memo, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { applyToJob, matchScore, setJobSave } from '../lib/api';
import { labelOf, CONTRACTS, WORK_MODES } from '../lib/areas';
import { compactNumber, timeAgo } from '../lib/format';
import { friendlyError } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { FeedPost, Job, Profile } from '../lib/types';
import { Avatar, Button, Chip, T } from './ui';

// ------------------------------------------------------------------
// Mídia do post (vídeo toca só quando está na tela)
// ------------------------------------------------------------------
function PostVideo({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  const [paused, setPaused] = useState(false);
  const [wasActive, setWasActive] = useState(active);

  // ao sair da tela, "despausa" para voltar tocando quando o usuário retornar
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setPaused(false);
  }

  useEffect(() => {
    if (active && !paused) player.play();
    else player.pause();
  }, [active, paused, player]);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused((v) => !v)} accessibilityLabel={paused ? 'Tocar vídeo' : 'Pausar vídeo'}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {paused && (
        <View style={styles.center} pointerEvents="none">
          <Ionicons name="play" size={64} color="rgba(244,244,245,0.85)" />
        </View>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------
// Item de post no feed (foto ou vídeo em tela cheia)
// ------------------------------------------------------------------
type PostProps = {
  post: FeedPost;
  height: number;
  active: boolean;
  liked: boolean;
  /** se já estava curtido quando o post carregou (já incluso em like_count) */
  baseLiked: boolean;
  saved: boolean;
  onLike: (post: FeedPost, like: boolean) => void;
  onSave: (post: FeedPost, save: boolean) => void;
};

export const FeedPostItem = memo(function FeedPostItem({ post, height, active, liked, baseLiked, saved, onLike, onSave }: PostProps) {
  const router = useRouter();
  const likes = Math.max(0, post.like_count - (baseLiked ? 1 : 0) + (liked ? 1 : 0));

  return (
    <View style={{ height, backgroundColor: '#15151C' }}>
      {post.kind === 'video' ? (
        <PostVideo uri={post.media_url} active={active} />
      ) : (
        <Image source={{ uri: post.media_url }} style={StyleSheet.absoluteFill} contentFit="contain" />
      )}

      {/* escurece a parte de baixo para o texto ficar legível */}
      <View pointerEvents="none" style={styles.scrim} />

      {/* ações laterais */}
      <View style={styles.rail}>
        <Pressable onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: post.author_id } })} accessibilityLabel={`Ver perfil de ${post.author_name}`}>
          <Avatar url={post.author_avatar} name={post.author_name || post.author_username} size={46} ring />
        </Pressable>
        <RailButton icon={liked ? 'heart' : 'heart-outline'} color={liked ? '#FF5A76' : colors.text} label={compactNumber(likes)} a11y="Curtir" onPress={() => onLike(post, !liked)} />
        <RailButton icon="chatbubble-outline" label={compactNumber(post.comment_count)} a11y="Comentar" onPress={() => router.push({ pathname: '/comentarios/[id]', params: { id: post.id } })} />
        <RailButton icon={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.accent : colors.text} label="Salvar" a11y="Salvar" onPress={() => onSave(post, !saved)} />
        <RailButton
          icon="paper-plane-outline"
          label="Enviar"
          a11y="Compartilhar"
          onPress={() => Share.share({ message: `${post.caption}\n\nVeja no WorkTok: @${post.author_username}` })}
        />
      </View>

      {/* legenda */}
      <View style={styles.caption}>
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: post.author_id } })}
        >
          <T v="strong" style={{ fontSize: 16 }}>@{post.author_username}</T>
          {!!post.author_headline && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{post.author_headline}</Text>
            </View>
          )}
          <T v="small" style={{ color: colors.textSoft }}>· {timeAgo(post.created_at)}</T>
        </Pressable>
        {!!post.caption && (
          <T numberOfLines={4} style={{ lineHeight: 21 }}>
            {post.caption}
          </T>
        )}
        {!!post.external_link && (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(post.external_link!)}
            style={styles.linkBtn}
            accessibilityRole="link"
          >
            <Ionicons name="link" size={16} color={colors.text} />
            <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 13 }} numberOfLines={1}>
              Abrir link da vaga (externo)
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

function RailButton({
  icon,
  label,
  onPress,
  a11y,
  color = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  a11y: string;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={8} style={{ alignItems: 'center', gap: 3 }}>
      <Ionicons name={icon} size={30} color={color} />
      <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------
// Vaga no meio do feed
// ------------------------------------------------------------------
export function JobInfoChips({ job }: { job: Job }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip small label={labelOf(WORK_MODES, job.work_mode)} />
      <Chip small label={labelOf(CONTRACTS, job.contract)} />
      {!!job.salary_range && <Chip small label={job.salary_range} />}
      {!!job.location && <Chip small label={job.location} />}
      {job.skills.slice(0, 3).map((s) => (
        <Chip small key={s} label={s} />
      ))}
    </View>
  );
}

export function MatchBar({ job, me }: { job: Job; me: Profile }) {
  const score = matchScore(job, me);
  const label = score >= 75 ? 'Alta' : score >= 45 ? 'Média' : 'Baixa';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="small" style={{ color: colors.textSoft }}>Combina com seu perfil</T>
        <T v="small" style={{ color: colors.accent, fontFamily: fonts.semibold }}>{label}</T>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ width: `${score}%`, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
      </View>
    </View>
  );
}

export function FeedJobItem({ job, height, me }: { job: Job; height: number; me: Profile }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const mine = job.author_id === me.id;

  async function candidatar() {
    setApplying(true);
    try {
      const conv = await applyToJob(job.id);
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      Alert.alert('Não foi possível candidatar', friendlyError(e));
    } finally {
      setApplying(false);
    }
  }

  async function salvar() {
    const next = !saved;
    setSaved(next);
    try {
      await setJobSave(me.id, job.id, next);
    } catch {
      setSaved(!next);
    }
  }

  return (
    <View style={{ height, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 110, paddingBottom: 24, gap: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, color: colors.accentText }}>VAGA PRA VOCÊ</Text>
        </View>
        <T v="small">{timeAgo(job.created_at)}</T>
      </View>

      <Pressable onPress={() => router.push({ pathname: '/vaga/[id]', params: { id: job.id } })} style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar url={job.author_avatar} name={job.company_name} size={48} />
          <View style={{ flex: 1 }}>
            <T v="strong">{job.company_name}</T>
            <T v="small">{job.area} · publicada por @{job.author_username}</T>
          </View>
        </View>
        <T v="display" style={{ fontSize: 28, lineHeight: 32 }}>{job.title}</T>
        <JobInfoChips job={job} />
        {!!job.description && (
          <T numberOfLines={5} style={{ color: colors.textSoft }}>
            {job.description}
          </T>
        )}
      </Pressable>

      <MatchBar job={job} me={me} />

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={salvar}
          accessibilityLabel="Salvar vaga"
          style={{ width: 56, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.accent : colors.text} />
        </Pressable>
        {mine ? (
          <Button title="Sua vaga · ver detalhes" kind="dark" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/vaga/[id]', params: { id: job.id } })} />
        ) : (
          <Button title="Candidatar em 1 toque" icon="flash" style={{ flex: 1 }} onPress={candidatar} loading={applying} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, backgroundColor: 'rgba(11,11,15,0.55)' },
  rail: { position: 'absolute', right: 12, bottom: 40, alignItems: 'center', gap: 20 },
  caption: { position: 'absolute', left: 16, right: 84, bottom: 28, gap: 10 },
  badge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: colors.accentText, fontFamily: fonts.semibold, fontSize: 12 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    maxWidth: '100%',
  },
});
