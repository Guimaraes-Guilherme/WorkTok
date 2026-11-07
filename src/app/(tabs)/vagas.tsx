import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobRow } from '../../components/lists';
import { Chip, Empty, T } from '../../components/ui';
import { fetchJobs } from '../../lib/api';
import { labelOf } from '../../lib/areas';
import { useMe } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';
import { isRecruiter, type Job } from '../../lib/types';

type Seg = 'abertas' | 'minhas';
const STATUS = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'recusada', label: 'Encerrada' },
  { value: 'contratado', label: 'Contratado!' },
];

export default function Vagas() {
  const router = useRouter();
  const { userId, profile } = useMe();
  const recruiter = isRecruiter(profile);
  const [seg, setSeg] = useState<Seg>('abertas');
  const [onlyMine, setOnlyMine] = useState(true);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (seg === 'abertas') {
        setJobs(await fetchJobs(onlyMine ? profile?.areas ?? [] : [], query.trim() || undefined));
      } else if (recruiter) {
        const { data } = await supabase.from('feed_jobs').select('*').eq('author_id', userId).order('created_at', { ascending: false });
        setJobs((data ?? []) as Job[]);
      } else {
        const { data } = await supabase
          .from('job_applications')
          .select('status, job_id')
          .eq('applicant_id', userId)
          .order('created_at', { ascending: false });
        const map: Record<string, string> = {};
        (data ?? []).forEach((r) => (map[r.job_id as string] = r.status as string));
        setStatus(map);
        const ids = Object.keys(map);
        if (!ids.length) setJobs([]);
        else {
          const { data: js } = await supabase.from('feed_jobs').select('*').in('id', ids);
          setJobs((js ?? []) as Job[]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [seg, onlyMine, query, profile, recruiter, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seg, onlyMine]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="display" style={{ fontSize: 28 }}>Vagas</T>
          {recruiter && (
            <Pressable
              onPress={() => router.push('/novo/vaga')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, height: 40, paddingHorizontal: 14, borderRadius: 12 }}
            >
              <Ionicons name="add" size={18} color={colors.accentText} />
              <T v="strong" style={{ color: colors.accentText, fontSize: 14 }}>Nova vaga</T>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip small label="Abertas" selected={seg === 'abertas'} onPress={() => setSeg('abertas')} />
          <Chip small label={recruiter ? 'Minhas vagas' : 'Candidaturas'} selected={seg === 'minhas'} onPress={() => setSeg('minhas')} />
        </View>

        {seg === 'abertas' && (
          <>
            <View style={{ height: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                placeholder="Cargo, ex.: designer júnior"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={load}
                returnKeyType="search"
                style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
              />
            </View>
            <Pressable onPress={() => setOnlyMine((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="switch" accessibilityState={{ checked: onlyMine }}>
              <Ionicons name={onlyMine ? 'checkbox' : 'square-outline'} size={20} color={onlyMine ? colors.accent : colors.muted} />
              <T v="small" style={{ color: colors.textSoft }}>Só das minhas áreas ({profile?.areas.join(', ')})</T>
            </Pressable>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
          renderItem={({ item }) => <JobRow job={item} right={status[item.id] ? labelOf(STATUS, status[item.id]) : undefined} />}
          ListEmptyComponent={
            <Empty
              icon="briefcase-outline"
              title={seg === 'abertas' ? 'Nenhuma vaga encontrada' : recruiter ? 'Você ainda não publicou vagas' : 'Nenhuma candidatura ainda'}
              text={seg === 'abertas' ? 'Tente desmarcar "só das minhas áreas" ou buscar outro cargo.' : undefined}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
