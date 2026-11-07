import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JobRow, PersonRow, PostGrid } from '../components/lists';
import { Chip, Empty, IconButton, T } from '../components/ui';
import { search } from '../lib/api';
import { useMe } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { FeedPost, Job, Profile } from '../lib/types';

const KEY = 'worktok:recent-searches';
type Tab = 'pessoas' | 'videos' | 'vagas';

export default function Busca() {
  const router = useRouter();
  const { profile } = useMe();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('pessoas');
  const [res, setRes] = useState<{ people: Profile[]; posts: FeedPost[]; jobs: Job[] } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => v && setRecent(JSON.parse(v)));
    // "em alta": vagas mais recentes das áreas do usuário
    let q2 = supabase.from('feed_jobs').select('*').eq('is_open', true).order('created_at', { ascending: false }).limit(6);
    if (profile?.areas.length) q2 = q2.in('area', profile.areas);
    q2.then(({ data }) => setTrending((data ?? []) as Job[]));
  }, [profile]);

  function saveRecent(list: string[]) {
    setRecent(list);
    AsyncStorage.setItem(KEY, JSON.stringify(list));
  }

  async function run(term = q) {
    const t = term.trim();
    if (!t) return;
    setQ(t);
    setLoading(true);
    saveRecent([t, ...recent.filter((r) => r !== t)].slice(0, 8));
    try {
      const r = await search(t);
      setRes(r);
      setTab(r.people.length ? 'pessoas' : r.posts.length ? 'videos' : 'vagas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            autoFocus
            placeholder="Pessoas, vídeos, vagas"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={(v) => {
              setQ(v);
              if (!v) setRes(null);
            }}
            onSubmitEditing={() => run()}
            returnKeyType="search"
            style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
          />
        </View>
        <Pressable onPress={() => run()} hitSlop={8} style={{ paddingHorizontal: 8, height: 44, justifyContent: 'center' }}>
          <T v="strong" style={{ color: colors.accent }}>Buscar</T>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : res ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Chip small label={`Pessoas (${res.people.length})`} selected={tab === 'pessoas'} onPress={() => setTab('pessoas')} />
            <Chip small label={`Posts (${res.posts.length})`} selected={tab === 'videos'} onPress={() => setTab('videos')} />
            <Chip small label={`Vagas (${res.jobs.length})`} selected={tab === 'vagas'} onPress={() => setTab('vagas')} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {tab === 'pessoas' && (
              <View style={{ paddingHorizontal: 20 }}>
                {res.people.length ? res.people.map((p) => <PersonRow key={p.id} person={p} />) : <Empty icon="person-outline" title="Ninguém encontrado" />}
              </View>
            )}
            {tab === 'videos' && (res.posts.length ? <PostGrid posts={res.posts} /> : <Empty icon="videocam-outline" title="Nenhum post encontrado" />)}
            {tab === 'vagas' && (
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {res.jobs.length ? res.jobs.map((j) => <JobRow key={j.id} job={j} />) : <Empty icon="briefcase-outline" title="Nenhuma vaga encontrada" />}
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {recent.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
              {recent.map((r) => (
                <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 48 }}>
                  <Ionicons name="time-outline" size={18} color={colors.muted} />
                  <Pressable style={{ flex: 1 }} onPress={() => run(r)}>
                    <T>{r}</T>
                  </Pressable>
                  <IconButton name="close" size={16} color={colors.muted} label="Remover do histórico" onPress={() => saveRecent(recent.filter((x) => x !== r))} />
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 8, backgroundColor: '#121217', marginVertical: 8 }} />
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
            <T v="title" style={{ fontSize: 17 }}>Vagas em alta em {profile?.areas[0] ?? 'todas as áreas'}</T>
            {trending.length ? trending.map((j) => <JobRow key={j.id} job={j} />) : <T v="small">Ainda não há vagas na sua área.</T>}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
