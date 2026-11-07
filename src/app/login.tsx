import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, T } from '../components/ui';
import { friendlyError, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!email || !password) return Alert.alert('Preencha e-mail e senha');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Não foi possível entrar', friendlyError(error));
  }

  async function esqueci() {
    if (!email.includes('@')) return Alert.alert('Digite seu e-mail no campo acima primeiro');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    Alert.alert(error ? 'Erro' : 'Pronto', error ? friendlyError(error) : 'Enviamos um link para redefinir sua senha.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="briefcase" size={30} color={colors.accentText} />
            </View>
            <T v="display">WorkTok</T>
            <T v="small" style={{ fontSize: 15 }}>Sua profissão, em vídeo.</T>
          </View>

          <View style={{ marginTop: 44, gap: 12 }}>
            <Field label="E-mail" placeholder="voce@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
            <Field label="Senha" placeholder="••••••••" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={entrar} />
            <T v="small" onPress={esqueci} style={{ alignSelf: 'flex-end', color: colors.accent, fontFamily: 'Inter_500Medium', paddingVertical: 6 }}>
              Esqueci a senha
            </T>
          </View>

          <Button title="Entrar" onPress={entrar} loading={loading} style={{ marginTop: 16 }} />

          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 32 }}>
            <T v="small" style={{ fontSize: 14 }}>Não tem conta? </T>
            <Link href="/cadastro">
              <T v="small" style={{ fontSize: 14, color: colors.accent, fontFamily: 'Inter_600SemiBold' }}>Criar conta</T>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
