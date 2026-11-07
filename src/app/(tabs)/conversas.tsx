import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Chip, Empty, T } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';
import { isRecruiter, type Conversation, type Profile } from '../../lib/types';

type Row = Conversation & { other: Profile | undefined; unread: number };
type Filter = 'todas' | 'recrutadores' | 'nao-lidas';

export default function Conversas() {
  const router = useRouter();
  const { userId } = useMe();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('todas');

  const load = useCallback(async () => {
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('last_message_at', { ascending: false })
      .limit(100);
    const list = (convs ?? []) as Conversation[];
    const otherIds = list.map((c) => (c.user_a === userId ? c.user_b : c.user_a));
    const [{ data: people }, { data: unread }] = await Promise.all([
      otherIds.length ? supabase.from('profiles').select('*').in('id', otherIds) : Promise.resolve({ data: [] }),
      list.length
        ? supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', list.map((c) => c.id))
            .is('read_at', null)
            .neq('sender_id', userId)
        : Promise.resolve({ data: [] }),
    ]);
    const byId = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p]));
    const counts: Record<string, number> = {};
    ((unread ?? []) as { conversation_id: string }[]).forEach((m) => (counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1));
    setRows(
      list.map((c) => ({
        ...c,
        other: byId.get(c.user_a === userId ? c.user_b : c.user_a),
        unread: counts[c.id] ?? 0,
      })),
    );
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // atualiza a lista quando chega mensagem nova
  useEffect(() => {
    const ch = supabase
      .channel('conversas-lista')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'recrutadores' ? isRecruiter(r.other) : filter === 'nao-lidas' ? r.unread > 0 : true,
      ),
    [rows, filter],
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <T v="display" style={{ fontSize: 28 }}>Conversas</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip small label="Todas" selected={filter === 'todas'} onPress={() => setFilter('todas')} />
          <Chip small label="Recrutadores" selected={filter === 'recrutadores'} onPress={() => setFilter('recrutadores')} />
          <Chip small label="Não lidas" selected={filter === 'nao-lidas'} onPress={() => setFilter('nao-lidas')} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const name = item.other?.full_name || item.other?.username || 'Usuário';
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}
              >
                <Avatar url={item.other?.avatar_url} name={name} size={52} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T v="strong" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</T>
                    {isRecruiter(item.other) && (
                      <View style={{ backgroundColor: colors.violet, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: colors.accentText }}>
                          {item.other?.account_type === 'empresa' ? 'EMPRESA' : 'RECRUTADOR'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <T v="small" numberOfLines={1} style={{ fontSize: 14, color: item.unread ? colors.text : colors.muted }}>
                    {item.last_message ?? 'Conversa iniciada'}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <T v="small" style={{ fontSize: 12 }}>{timeAgo(item.last_message_at)}</T>
                  {item.unread > 0 && (
                    <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.accentText }}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Empty
              icon="chatbubbles-outline"
              title="Nenhuma conversa ainda"
              text="Você conversa com quem segue você de volta, ou com recrutadores que entrarem em contato."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
