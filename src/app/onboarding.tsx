import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, T } from '../components/ui';
import { AREAS, MAX_AREAS } from '../lib/areas';
import { useMe } from '../lib/auth';
import { friendlyError, supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';

export default function Onboarding() {
  const { userId, refreshProfile } = useMe();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const list = useMemo(
    () => AREAS.filter((a) => a.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );

  function toggle(area: string) {
    setPicked((p) => {
      if (p.includes(area)) return p.filter((a) => a !== area);
      if (p.length >= MAX_AREAS) {
        Alert.alert(`Escolha até ${MAX_AREAS} áreas`);
        return p;
      }
      return [...p, area];
    });
  }

  async function continuar() {
    if (!picked.length) return Alert.alert('Escolha pelo menos uma área');
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ areas: picked, headline: picked[0], onboarded: true })
      .eq('id', userId);
    setSaving(false);
    if (error) return Alert.alert('Erro', friendlyError(error));
    await refreshProfile();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <T v="label">ÚLTIMO PASSO</T>
        <T v="display" style={{ marginTop: 10 }}>Qual é a sua área?</T>
        <T style={{ color: colors.muted, marginTop: 8 }}>
          Seu feed vai mostrar vídeos, vagas e novidades só dela. Escolha até {MAX_AREAS}.
        </T>

        <View
          style={{
            marginTop: 24,
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Buscar profissão"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {list.map((a) => (
            <Chip key={a} label={picked.includes(a) ? `${a} ✓` : a} selected={picked.includes(a)} onPress={() => toggle(a)} />
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 32, gap: 10 }}>
        <Button title="Continuar" kind="light" icon="arrow-forward" onPress={continuar} loading={saving} disabled={!picked.length} />
        <T v="small" style={{ textAlign: 'center' }}>Dá pra mudar depois no perfil</T>
      </View>
    </SafeAreaView>
  );
}
