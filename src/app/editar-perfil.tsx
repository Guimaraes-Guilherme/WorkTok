import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Chip, Field, Header, T } from '../components/ui';
import { AREAS, MAX_AREAS } from '../lib/areas';
import { useMe } from '../lib/auth';
import { friendlyError, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { pickMedia, uploadMedia } from '../lib/upload';

export default function EditarPerfil() {
  const router = useRouter();
  const { userId, profile, refreshProfile } = useMe();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [skills, setSkills] = useState((profile?.skills ?? []).join(', '));
  const [areas, setAreas] = useState<string[]>(profile?.areas ?? []);
  const [openToWork, setOpenToWork] = useState(profile?.open_to_work ?? false);
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);

  async function changeAvatar() {
    try {
      const m = await pickMedia('foto');
      if (!m) return;
      const url = await uploadMedia(userId, m, 'avatar');
      setAvatar(url);
    } catch (e) {
      Alert.alert('Erro', friendlyError(e));
    }
  }

  function toggleArea(a: string) {
    setAreas((list) => (list.includes(a) ? list.filter((x) => x !== a) : list.length >= MAX_AREAS ? list : [...list, a]));
  }

  async function save() {
    const user = username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(user)) return Alert.alert('Nome de usuário inválido', '3 a 30 caracteres: letras minúsculas, números, _ ou .');
    if (!areas.length) return Alert.alert('Escolha pelo menos uma área');
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: user,
        headline: headline.trim(),
        bio: bio.trim().slice(0, 300),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15),
        areas,
        open_to_work: openToWork,
        avatar_url: avatar,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) return Alert.alert('Não foi possível salvar', friendlyError(error));
    await refreshProfile();
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Editar perfil" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={changeAvatar} style={{ alignItems: 'center', gap: 8 }} accessibilityLabel="Trocar foto de perfil">
            <Avatar url={avatar} name={fullName || username} size={96} />
            <T v="small" style={{ color: colors.accent }}>Trocar foto</T>
          </Pressable>

          <Field label="Nome" value={fullName} onChangeText={setFullName} />
          <Field label="Nome de usuário" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Field label="Profissão (aparece no seu perfil)" placeholder="Ex.: Product Designer" value={headline} onChangeText={setHeadline} maxLength={40} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={300} style={{ minHeight: 96 }} />
          <Field label="Skills (separadas por vírgula)" placeholder="React, Node, Figma" value={skills} onChangeText={setSkills} />

          <View style={{ gap: 8 }}>
            <T v="small">Minhas áreas (até {MAX_AREAS})</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {AREAS.map((a) => (
                <Chip key={a} small label={a} selected={areas.includes(a)} onPress={() => toggleArea(a)} />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, backgroundColor: colors.surface }}>
            <View style={{ flex: 1 }}>
              <T v="strong">Aberto(a) a oportunidades</T>
              <T v="small">Mostra um selo no seu perfil para recrutadores</T>
            </View>
            <Switch value={openToWork} onValueChange={setOpenToWork} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.text} />
          </View>

          <Button title="Salvar" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
