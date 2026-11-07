import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, IconButton, T } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { clock } from '../../lib/format';
import { friendlyError, supabase } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';
import { isRecruiter, type Conversation, type Job, type Message, type Profile } from '../../lib/types';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useMe();
    const [other, setOther] = useState<Profile | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const markRead = useCallback(async () => {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', id).neq('sender_id', userId).is('read_at', null);
  }, [id, userId]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('conversations').select('*').eq('id', id).single();
      if (!c) return;
      const conversation = c as Conversation;
      const otherId = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
      const [{ data: p }, { data: msgs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: false }).limit(200),
      ]);
      setOther(p as Profile);
      setMessages((msgs ?? []) as Message[]);
      if (conversation.job_id) {
        const { data: j } = await supabase.from('feed_jobs').select('*').eq('id', conversation.job_id).maybeSingle();
        setJob((j as Job) ?? null);
        const applicant = j && (j as Job).author_id === userId ? otherId : userId;
        const { data: a } = await supabase
          .from('job_applications')
          .select('status')
          .eq('job_id', conversation.job_id)
          .eq('applicant_id', applicant)
          .maybeSingle();
        setAppStatus((a?.status as string) ?? null);
      }
      markRead();
    })();

    // mensagens novas em tempo real
    const ch = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
        if (m.sender_id !== userId) markRead();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, userId, markRead]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText('');
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: userId, body }).select().single();
    setSending(false);
    if (error) {
      setText(body);
      return Alert.alert('Mensagem não enviada', friendlyError(error));
    }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Message, ...prev]));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const name = other?.full_name || other?.username || '';
  const statusLabel: Record<string, string> = {
    enviada: 'Candidatura enviada',
    em_analise: 'Em análise',
    entrevista: 'Entrevista',
    recusada: 'Encerrada',
    contratado: 'Contratado!',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* cabeçalho */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1F1F27' }}>
          <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} />
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => other && router.push({ pathname: '/perfil/[id]', params: { id: other.id } })}
          >
            <Avatar url={other?.avatar_url} name={name || '?'} size={40} />
            <View style={{ flex: 1 }}>
              <T v="strong" numberOfLines={1}>{name}</T>
              <T v="small" numberOfLines={1}>
                {isRecruiter(other) ? (other?.account_type === 'empresa' ? 'Empresa' : 'Recrutador(a)') : other?.headline || `@${other?.username ?? ''}`}
              </T>
            </View>
          </Pressable>
        </View>

        {/* vaga relacionada */}
        {job && (
          <Pressable
            onPress={() => router.push({ pathname: '/vaga/[id]', params: { id: job.id } })}
            style={{ margin: 14, marginBottom: 0, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Avatar url={job.author_avatar} name={job.company_name} size={36} />
            <View style={{ flex: 1 }}>
              <T v="strong" numberOfLines={1} style={{ fontSize: 14 }}>{job.title}</T>
              <T v="small" style={{ fontSize: 12 }}>{job.company_name}</T>
            </View>
            {appStatus && (
              <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.accentText }}>{statusLabel[appStatus] ?? appStatus}</Text>
              </View>
            )}
          </Pressable>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === userId;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 6 : 18,
                    borderBottomLeftRadius: mine ? 18 : 6,
                    backgroundColor: mine ? colors.accent : colors.surface2,
                  }}
                >
                  <Text style={{ fontFamily: mine ? fonts.medium : fonts.regular, fontSize: 15, lineHeight: 21, color: mine ? colors.accentText : colors.text }}>{item.body}</Text>
                </View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 3, alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                  {clock(item.created_at)}
                  {mine && item.read_at ? ' · lida' : ''}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: 24 }}>
              <T v="small" style={{ textAlign: 'center' }}>Diga oi para {name.split(' ')[0] || 'começar'}!</T>
            </View>
          }
        />

        {/* campo de mensagem */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#1F1F27' }}>
          <TextInput
            placeholder="Mensagem"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 22,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              color: colors.text,
              fontFamily: fonts.regular,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={send}
            disabled={sending || !text.trim()}
            accessibilityLabel="Enviar"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.5 }}
          >
            <Ionicons name="arrow-up" size={22} color={colors.accentText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
