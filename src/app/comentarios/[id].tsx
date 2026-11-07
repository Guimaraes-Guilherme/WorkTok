import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Empty, IconButton, T } from '../../components/ui';
import { addComment, fetchComments, type CommentRow } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import { friendlyError } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';

export default function Comentarios() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useMe();
  const [list, setList] = useState<CommentRow[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments(id).then(setList).catch(() => {});
  }, [id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await addComment(userId, id, body);
      setText('');
      setList(await fetchComments(id));
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <T v="strong" style={{ fontSize: 17 }}>{list.length} comentários</T>
          <IconButton name="close" label="Fechar" onPress={() => router.back()} />
        </View>
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 18 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: item.author_id } })}>
                <Avatar url={item.author?.avatar_url} name={item.author?.full_name || item.author?.username || '?'} size={36} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="small">
                  @{item.author?.username} · {timeAgo(item.created_at)}
                </T>
                <T>{item.body}</T>
              </View>
            </View>
          )}
          ListEmptyComponent={<Empty icon="chatbubble-outline" title="Seja o primeiro a comentar" />}
        />
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#1F1F27' }}>
          <TextInput
            placeholder="Adicionar comentário"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            maxLength={500}
            style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
          />
          <Pressable
            onPress={send}
            disabled={sending || !text.trim()}
            accessibilityLabel="Publicar comentário"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.5 }}
          >
            <Ionicons name="arrow-up" size={22} color={colors.accentText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
