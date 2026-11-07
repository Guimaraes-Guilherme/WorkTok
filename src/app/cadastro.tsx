import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Field, IconButton, T } from '../components/ui';
import { ACCOUNT_TYPES } from '../lib/areas';
import { friendlyError, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import type { AccountType } from '../lib/types';

export default function Cadastro() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<AccountType>('profissional');
  const [loading, setLoading] = useState(false);

  async function criar() {
    const user = username.trim().replace(/^@/, '').toLowerCase();
    if (!fullName.trim() || !user || !email.trim() || !password) return Alert.alert('Preencha todos os campos');
    if (!/^[a-z0-9_.]{3,30}$/.test(user))
      return Alert.alert('Nome de usuário inválido', 'Use de 3 a 30 caracteres: letras minúsculas, números, _ ou .');
    if (password.length < 8) return Alert.alert('Senha curta', 'Use pelo menos 8 caracteres.');

    setLoading(true);
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', user).maybeSingle();
    if (taken) {
      setLoading(false);
      return Alert.alert('Esse @ já está em uso', 'Escolha outro nome de usuário.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), username: user, account_type: type } },
    });
    setLoading(false);
    if (error) return Alert.alert('Não foi possível criar a conta', friendlyError(error));
    if (!data.session) {
      Alert.alert('Confirme seu e-mail', 'Enviamos um link de confirmação. Depois de confirmar, é só entrar.');
      router.replace('/login');
    }
    // com sessão ativa, o app leva direto para a escolha de área
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginLeft: -12 }}>
            <IconButton name="chevron-back" label="Voltar" onPress={() => router.back()} />
          </View>
          <T v="display" style={{ marginTop: 8 }}>Criar conta</T>
          <T v="small" style={{ fontSize: 15, marginTop: 4 }}>Leva menos de 1 minuto.</T>

          <View style={{ marginTop: 24, gap: 12 }}>
            <Field label="Nome" placeholder="Seu nome completo" value={fullName} onChangeText={setFullName} autoComplete="name" />
            <Field label="Nome de usuário" placeholder="@seunome" autoCapitalize="none" value={username} onChangeText={setUsername} />
            <Field label="E-mail" placeholder="voce@email.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} autoComplete="email" />
            <Field label="Senha" placeholder="Mínimo 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} autoComplete="new-password" />
          </View>

          <T v="small" style={{ marginTop: 20, marginBottom: 8 }}>Tipo de conta</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {ACCOUNT_TYPES.map((t) => (
              <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
            ))}
          </View>
          {type !== 'profissional' && (
            <T v="small" style={{ marginTop: 8, lineHeight: 18 }}>
              Contas de recrutador e empresa podem publicar vagas e iniciar conversas com candidatos.
            </T>
          )}

          <View style={{ flex: 1, minHeight: 24 }} />
          <Button title="Criar conta" kind="light" onPress={criar} loading={loading} />
          <T v="small" style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>
            Ao continuar, você aceita os Termos e a Política de Privacidade.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
