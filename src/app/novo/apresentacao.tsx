import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoPreview } from '../../components/new-post';
import { Button, Field, Header, T } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { duration } from '../../lib/format';
import { friendlyError, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { MAX_PRESENTATION_SECONDS, pickMedia, uploadMedia, type PickedMedia } from '../../lib/upload';

const SUGGESTIONS = ['Quem sou eu', 'Minhas skills', 'Meus projetos'];

/** Grava/escolhe um dos 3 vídeos de apresentação (até 3 minutos) */
export default function NovaApresentacao() {
  const { slot: slotParam } = useLocalSearchParams<{ slot?: string }>();
  const slot = Math.min(3, Math.max(1, Number(slotParam) || 1));
  const router = useRouter();
  const { userId } = useMe();
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState(SUGGESTIONS[slot - 1]);
  const [sending, setSending] = useState(false);

  async function pick(camera: boolean) {
    try {
      const m = await pickMedia('video', { camera, maxSeconds: MAX_PRESENTATION_SECONDS });
      if (!m) return;
      if (!m.durationSeconds) return Alert.alert('Não foi possível ler a duração do vídeo');
      if (m.durationSeconds > MAX_PRESENTATION_SECONDS) {
        return Alert.alert('Vídeo muito longo', `Vídeos de apresentação têm limite de 3 minutos. Este tem ${duration(m.durationSeconds)}.`);
      }
      setMedia(m);
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    }
  }

  async function save() {
    if (!media?.durationSeconds) return;
    setSending(true);
    try {
      const url = await uploadMedia(userId, media, 'apresentacao');
      const { error } = await supabase.from('presentation_videos').upsert({
        user_id: userId,
        slot,
        title: title.trim().slice(0, 40),
        video_url: url,
        duration_seconds: media.durationSeconds,
      });
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={`Apresentação ${slot} de 3`} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <T style={{ color: colors.textSoft }}>
          Grave até 3 minutos falando sobre você: quem você é, suas competências, projetos. Esse vídeo fica fixado no topo do seu perfil.
        </T>

        {media ? (
          <View style={{ gap: 8 }}>
            <VideoPreview uri={media.uri} height={420} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="small">Duração: {duration(media.durationSeconds ?? 0)} / 3:00</T>
              <T v="small" style={{ color: colors.accent }} onPress={() => setMedia(null)}>Trocar</T>
            </View>
          </View>
        ) : (
          <View style={{ height: 300, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3A3A46', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <Ionicons name="person-circle-outline" size={44} color={colors.muted} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Galeria" kind="dark" icon="images-outline" height={46} onPress={() => pick(false)} />
              <Button title="Gravar" icon="radio-button-on" height={46} onPress={() => pick(true)} />
            </View>
            <T v="small">Máximo de 3 minutos</T>
          </View>
        )}

        <Field label="Título do vídeo" value={title} onChangeText={setTitle} maxLength={40} placeholder="Ex.: Quem sou eu" />

        <Button title="Salvar no perfil" onPress={save} loading={sending} disabled={!media} />
      </ScrollView>
    </SafeAreaView>
  );
}
