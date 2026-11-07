import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AREAS } from '../lib/areas';
import { useMe } from '../lib/auth';
import { duration } from '../lib/format';
import { friendlyError, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { MAX_POST_VIDEO_SECONDS, pickMedia, uploadMedia, type PickedMedia } from '../lib/upload';
import { Button, Chip, Field, Header, T } from './ui';

export function VideoPreview({ uri, height = 360 }: { uri: string; height?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={{ height, borderRadius: 20, backgroundColor: '#000' }} contentFit="contain" nativeControls />;
}

/** Tela de nova publicação (foto ou vídeo) */
export function NewPostForm({ kind }: { kind: 'foto' | 'video' }) {
  const router = useRouter();
  const { userId, profile } = useMe();
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [area, setArea] = useState(profile?.areas[0] ?? AREAS[0]);
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  async function pick(camera: boolean) {
    try {
      const m = await pickMedia(kind, { camera, maxSeconds: MAX_POST_VIDEO_SECONDS });
      if (!m) return;
      if (kind === 'video' && m.durationSeconds && m.durationSeconds > MAX_POST_VIDEO_SECONDS) {
        return Alert.alert('Vídeo muito longo', `O limite é de ${MAX_POST_VIDEO_SECONDS / 60} minutos.`);
      }
      setMedia(m);
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    }
  }

  async function publish() {
    if (!media) return Alert.alert(kind === 'foto' ? 'Escolha uma foto' : 'Escolha um vídeo');
    const external = link.trim();
    if (external && !/^https?:\/\//i.test(external)) return Alert.alert('Link inválido', 'O link precisa começar com http:// ou https://');

    setSending(true);
    try {
      const url = await uploadMedia(userId, media, kind === 'foto' ? 'fotos' : 'videos');
      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        kind,
        media_url: url,
        caption: caption.trim(),
        area,
        external_link: external || null,
      });
      if (error) throw error;
      Alert.alert('Publicado!', 'Seu post já está no feed.');
      router.replace('/perfil');
    } catch (e) {
      Alert.alert('Não foi possível publicar', friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  const areas = profile?.areas.length ? profile.areas : [...AREAS];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={kind === 'foto' ? 'Publicar foto' : 'Publicar vídeo'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {media ? (
            <View style={{ gap: 8 }}>
              {kind === 'foto' ? (
                <Image source={{ uri: media.uri }} style={{ height: 380, borderRadius: 20 }} contentFit="cover" />
              ) : (
                <VideoPreview uri={media.uri} />
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {media.durationSeconds ? <T v="small">Duração: {duration(media.durationSeconds)}</T> : <View />}
                <Pressable onPress={() => setMedia(null)}>
                  <T v="small" style={{ color: colors.accent }}>Trocar</T>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ height: 260, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3A3A46', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Ionicons name={kind === 'foto' ? 'image-outline' : 'videocam-outline'} size={40} color={colors.muted} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Galeria" kind="dark" icon="images-outline" height={46} onPress={() => pick(false)} />
                <Button title={kind === 'foto' ? 'Câmera' : 'Gravar'} icon={kind === 'foto' ? 'camera-outline' : 'radio-button-on'} height={46} onPress={() => pick(true)} />
              </View>
              {kind === 'video' && <T v="small">Até {MAX_POST_VIDEO_SECONDS / 60} minutos</T>}
            </View>
          )}

          <Field label="Legenda" placeholder="Conte o contexto: rotina, dica, bastidor..." value={caption} onChangeText={setCaption} multiline maxLength={2200} style={{ minHeight: 100 }} />

          <View style={{ gap: 8 }}>
            <T v="small">Área do post</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {areas.map((a) => (
                <Chip key={a} small label={a} selected={area === a} onPress={() => setArea(a)} />
              ))}
            </View>
          </View>

          <Field
            label="Link da vaga (opcional, externo)"
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
            value={link}
            onChangeText={setLink}
          />
          <T v="small" style={{ marginTop: -10, fontSize: 12 }}>
            Usuários comuns divulgam vagas apenas por link externo. Recrutadores e empresas usam “Publicar vaga”.
          </T>

          <Button title="Publicar" onPress={publish} loading={sending} disabled={!media} />
          {sending && <T v="small" style={{ textAlign: 'center' }}>Enviando... vídeos podem levar alguns segundos.</T>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
