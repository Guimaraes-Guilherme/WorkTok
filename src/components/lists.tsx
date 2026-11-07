import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { labelOf, CONTRACTS, WORK_MODES } from '../lib/areas';
import { compactNumber, timeAgo } from '../lib/format';
import { colors, fonts } from '../lib/theme';
import type { FeedPost, Job, Profile } from '../lib/types';
import { Avatar, T } from './ui';

/** Linha de vaga usada na aba Vagas e na busca */
export function JobRow({ job, right }: { job: Job; right?: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vaga/[id]', params: { id: job.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Avatar url={job.author_avatar} name={job.company_name} size={44} />
      <View style={{ flex: 1, gap: 3 }}>
        <T v="strong" numberOfLines={1}>{job.title}</T>
        <T v="small" numberOfLines={1}>
          {job.company_name} · {labelOf(WORK_MODES, job.work_mode)} · {labelOf(CONTRACTS, job.contract)}
        </T>
        <T v="small" style={{ fontSize: 12 }}>
          {job.area} · {timeAgo(job.created_at)}
          {job.salary_range ? ` · ${job.salary_range}` : ''}
        </T>
      </View>
      {right ? (
        <View style={{ alignSelf: 'center', backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.accentText }}>{right}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ alignSelf: 'center' }} />
      )}
    </Pressable>
  );
}

/** Linha de pessoa (busca) */
export function PersonRow({ person }: { person: Profile }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: person.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
    >
      <Avatar url={person.avatar_url} name={person.full_name || person.username} size={48} />
      <View style={{ flex: 1 }}>
        <T v="strong">{person.full_name || person.username}</T>
        <T v="small">
          @{person.username}
          {person.headline ? ` · ${person.headline}` : ''}
        </T>
      </View>
    </Pressable>
  );
}

const W = Dimensions.get('window').width;

/** Grade 3 colunas de posts (perfil e busca) */
export function PostGrid({ posts }: { posts: FeedPost[] }) {
  const router = useRouter();
  const size = (W - 4) / 3;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {posts.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
          style={{ width: size, height: size * 1.33, backgroundColor: colors.surface2 }}
          accessibilityLabel={p.kind === 'video' ? 'Abrir vídeo' : 'Abrir foto'}
        >
          {p.kind === 'foto' ? (
            <Image source={{ uri: p.media_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E27' }}>
              <Ionicons name="videocam" size={26} color={colors.muted} />
            </View>
          )}
          <View style={{ position: 'absolute', left: 8, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="heart" size={12} color={colors.text} />
            <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 12 }}>{compactNumber(p.like_count)}</Text>
          </View>
          {p.kind === 'foto' && (
            <Ionicons name="image-outline" size={15} color={colors.text} style={{ position: 'absolute', top: 6, right: 6 }} />
          )}
        </Pressable>
      ))}
    </View>
  );
}
