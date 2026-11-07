import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Empty, Field, Header, T } from '../../components/ui';
import { AREAS, CONTRACTS, WORK_MODES } from '../../lib/areas';
import { useMe } from '../../lib/auth';
import { friendlyError, supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { isRecruiter } from '../../lib/types';

/** Publicar vaga — só para recrutador/RH e empresa */
export default function NovaVaga() {
  const router = useRouter();
  const { userId, profile } = useMe();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(profile?.account_type === 'empresa' ? profile.full_name : '');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState<string>('remoto');
  const [contract, setContract] = useState<string>('clt');
  const [salary, setSalary] = useState('');
  const [area, setArea] = useState<string>(profile?.areas[0] ?? AREAS[0]);
  const [skills, setSkills] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  if (!isRecruiter(profile)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Publicar vaga" />
        <Empty
          icon="lock-closed-outline"
          title="Só para recrutadores e empresas"
          text="Para divulgar uma vaga, publique uma foto ou vídeo com o link externo da vaga."
        />
      </SafeAreaView>
    );
  }

  async function publish() {
    if (title.trim().length < 3 || !company.trim()) return Alert.alert('Preencha o cargo e a empresa');
    setSending(true);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        author_id: userId,
        title: title.trim(),
        company_name: company.trim(),
        location: location.trim(),
        work_mode: mode,
        contract,
        salary_range: salary.trim() || null,
        area,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10),
        description: description.trim(),
      })
      .select('id')
      .single();
    setSending(false);
    if (error) return Alert.alert('Não foi possível publicar', friendlyError(error));
    router.replace({ pathname: '/vaga/[id]', params: { id: data.id } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Publicar vaga" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Field label="Cargo" placeholder="Ex.: Designer de Produto Jr." value={title} onChangeText={setTitle} maxLength={80} />
          <Field label="Empresa" placeholder="Nome da empresa" value={company} onChangeText={setCompany} />
          <Field label="Local" placeholder="Ex.: São Paulo, SP" value={location} onChangeText={setLocation} />

          <Group label="Modelo">
            {WORK_MODES.map((m) => (
              <Chip key={m.value} small label={m.label} selected={mode === m.value} onPress={() => setMode(m.value)} />
            ))}
          </Group>
          <Group label="Contrato">
            {CONTRACTS.map((c) => (
              <Chip key={c.value} small label={c.label} selected={contract === c.value} onPress={() => setContract(c.value)} />
            ))}
          </Group>
          <Group label="Área">
            {AREAS.map((a) => (
              <Chip key={a} small label={a} selected={area === a} onPress={() => setArea(a)} />
            ))}
          </Group>

          <Field label="Faixa salarial (opcional)" placeholder="Ex.: R$ 4.000 – 6.000" value={salary} onChangeText={setSalary} />
          <Field label="Skills (separadas por vírgula)" placeholder="Figma, UX Research, Prototipação" value={skills} onChangeText={setSkills} />
          <Field label="Descrição" placeholder="Responsabilidades, requisitos, benefícios..." value={description} onChangeText={setDescription} multiline maxLength={4000} style={{ minHeight: 140 }} />

          <Button title="Publicar vaga" onPress={publish} loading={sending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T v="small">{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}
