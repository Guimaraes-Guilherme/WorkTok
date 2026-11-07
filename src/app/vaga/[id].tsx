import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobInfoChips, MatchBar } from '../../components/feed';
import { Avatar, Button, Header, Loading, T } from '../../components/ui';
import { applyToJob, fetchJob, hasApplied, isJobSaved, setJobSave, startConversation } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import { friendlyError, supabase } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';
import type { Job, Profile } from '../../lib/types';

const STATUS = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'recusada', label: 'Encerrar' },
  { value: 'contratado', label: 'Contratado' },
];

type Applicant = { applicant_id: string; status: string; created_at: string; profile: Profile | null };

export default function VagaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId, profile } = useMe();
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const mine = job?.author_id === userId;

  const load = useCallback(async () => {
    try {
      const j = await fetchJob(id);
      setJob(j);
      if (j.author_id === userId) {
        const { data } = await supabase
          .from('job_applications')
          .select('applicant_id, status, created_at, profile:profiles!job_applications_applicant_id_fkey(*)')
          .eq('job_id', id)
          .order('created_at', { ascending: false });
        setApplicants((data ?? []) as unknown as Applicant[]);
      } else {
        const [s, sv] = await Promise.all([hasApplied(userId, id), isJobSaved(userId, id)]);
        setStatus(s);
        setSaved(sv);
      }
    } catch (e) {
      Alert.alert('Vaga não encontrada', friendlyError(e));
      router.back();
    }
  }, [id, userId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function candidatar() {
    setApplying(true);
    try {
      const conv = await applyToJob(id);
      setStatus('enviada');
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      Alert.alert('Não foi possível candidatar', friendlyError(e));
    } finally {
      setApplying(false);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    await setJobSave(userId, id, next).catch(() => setSaved(!next));
  }

  async function changeStatus(a: Applicant) {
    Alert.alert('Status da candidatura', a.profile?.full_name ?? '', [
      ...STATUS.map((s) => ({
        text: s.label,
        onPress: async () => {
          const { error } = await supabase.from('job_applications').update({ status: s.value }).eq('job_id', id).eq('applicant_id', a.applicant_id);
          if (error) Alert.alert('Erro', friendlyError(error));
          else setApplicants((list) => list.map((x) => (x.applicant_id === a.applicant_id ? { ...x, status: s.value } : x)));
        },
      })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function talk(applicantId: string) {
    try {
      const conv = await startConversation(applicantId, id);
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    }
  }

  async function toggleOpen() {
    if (!job) return;
    const { error } = await supabase.from('jobs').update({ is_open: !job.is_open }).eq('id', id);
    if (error) return Alert.alert('Erro', friendlyError(error));
    setJob({ ...job, is_open: !job.is_open });
  }

  if (!job || !profile) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Vaga" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 140 }}>
        <Pressable onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: job.author_id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar url={job.author_avatar} name={job.company_name} size={52} />
          <View style={{ flex: 1 }}>
            <T v="strong">{job.company_name}</T>
            <T v="small">
              por @{job.author_username} · {timeAgo(job.created_at)}
            </T>
          </View>
        </Pressable>

        <T v="display" style={{ fontSize: 30, lineHeight: 34 }}>{job.title}</T>
        {!job.is_open && <T style={{ color: colors.danger }}>Esta vaga está encerrada.</T>}
        <JobInfoChips job={job} />
        {!mine && <MatchBar job={job} me={profile} />}

        <View style={{ gap: 8 }}>
          <T v="title" style={{ fontSize: 18 }}>Sobre a vaga</T>
          <T style={{ color: colors.textSoft }}>{job.description || 'Sem descrição.'}</T>
        </View>

        {job.skills.length > 0 && (
          <View style={{ gap: 8 }}>
            <T v="title" style={{ fontSize: 18 }}>Skills desejadas</T>
            <T style={{ color: colors.textSoft }}>{job.skills.join(' · ')}</T>
          </View>
        )}

        {mine && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="title" style={{ fontSize: 18 }}>Candidatos ({applicants.length})</T>
              <Pressable onPress={toggleOpen}>
                <T v="small" style={{ color: job.is_open ? colors.danger : colors.accent, fontFamily: fonts.semibold }}>
                  {job.is_open ? 'Encerrar vaga' : 'Reabrir vaga'}
                </T>
              </Pressable>
            </View>
            {applicants.length === 0 && <T v="small">Ninguém se candidatou ainda.</T>}
            {applicants.map((a) => (
              <View key={a.applicant_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Pressable onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: a.applicant_id } })}>
                  <Avatar url={a.profile?.avatar_url} name={a.profile?.full_name || a.profile?.username || '?'} size={44} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <T v="strong" numberOfLines={1}>{a.profile?.full_name || a.profile?.username}</T>
                  <Pressable onPress={() => changeStatus(a)}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.accent }}>
                      {STATUS.find((s) => s.value === a.status)?.label ?? a.status} ▾
                    </Text>
                  </Pressable>
                </View>
                <Button title="Conversar" kind="dark" height={38} onPress={() => talk(a.applicant_id)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {!mine && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 32, flexDirection: 'row', gap: 10 }}>
          <Button title={saved ? 'Salva' : 'Salvar'} kind="ghost" icon={saved ? 'bookmark' : 'bookmark-outline'} onPress={toggleSave} style={{ backgroundColor: colors.bg }} />
          {status ? (
            <Button title="Candidatura enviada ✓" kind="dark" style={{ flex: 1 }} onPress={candidatar} />
          ) : (
            <Button title="Candidatar em 1 toque" icon="flash" style={{ flex: 1 }} onPress={candidatar} loading={applying} disabled={!job.is_open} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
