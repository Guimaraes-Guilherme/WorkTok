import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { supabaseConfigured } from '../lib/supabase';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, session, profile } = useAuth();
  const signedIn = Boolean(session);
  const ready = signedIn && Boolean(profile?.onboarded);
  const needsOnboarding = signedIn && Boolean(profile) && !profile?.onboarded;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading || (signedIn && !profile)) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!signedIn} redirectTo="/login">
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding} redirectTo={signedIn ? '/' : '/login'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={ready} redirectTo={signedIn ? '/onboarding' : '/login'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="perfil/[id]" />
        <Stack.Screen name="vaga/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="busca" options={{ animation: 'fade' }} />
        <Stack.Screen name="comentarios/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="novo/foto" />
        <Stack.Screen name="novo/video" />
        <Stack.Screen name="novo/vaga" />
        <Stack.Screen name="novo/apresentacao" />
        <Stack.Screen name="editar-perfil" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  if (!supabaseConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 28, gap: 12 }}>
        <Text style={{ color: colors.accent, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' }}>Falta configurar o Supabase</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' }}>
          Crie o arquivo .env na pasta do projeto com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (veja o
          README) e reinicie com: npx expo start --clear
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
