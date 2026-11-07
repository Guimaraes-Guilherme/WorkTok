import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login só com o app aberto (recomendação do Supabase para React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Traduz erros comuns para mensagens em português */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (msg.includes('chat_not_allowed'))
    return 'Para conversar, vocês precisam se seguir — ou o contato precisa partir de um recrutador.';
  if (msg.includes('profiles_username_key') || msg.includes('duplicate key'))
    return 'Esse nome de usuário já está em uso.';
  if (msg.includes('username_check')) return 'Usuário: 3 a 30 caracteres, só letras minúsculas, números, _ e .';
  if (msg.includes('row-level security')) return 'Você não tem permissão para fazer isso.';
  if (msg.includes('Network request failed')) return 'Sem conexão. Verifique sua internet.';
  return msg;
}
