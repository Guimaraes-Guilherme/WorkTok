import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { colors, fonts } from '../../lib/theme';
import { isRecruiter } from '../../lib/types';

export default function Postar() {
  const router = useRouter();
  const { profile } = useMe();
  const recruiter = isRecruiter(profile);
  const tileH = recruiter ? 170 : 210;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <T v="display" style={{ fontSize: 28 }}>Criar</T>
        <T style={{ color: colors.muted, marginTop: -8, marginBottom: 12 }}>O que você quer compartilhar hoje?</T>

        <Tile
          height={tileH}
          title="Publicar foto"
          text="Seu setup, um certificado, o time"
          icon="image-outline"
          bg={colors.surface2}
          fg={colors.text}
          iconBg={colors.text}
          iconFg={colors.bg}
          sub={colors.muted}
          border
          onPress={() => router.push('/novo/foto')}
        />
        <Tile
          height={tileH}
          title="Publicar vídeo"
          text="Rotina, dicas, bastidores do trabalho"
          icon="videocam-outline"
          bg={colors.accent}
          fg={colors.accentText}
          iconBg={colors.bg}
          iconFg={colors.text}
          sub="#2A2F14"
          onPress={() => router.push('/novo/video')}
        />
        {recruiter && (
          <Tile
            height={tileH}
            title="Publicar vaga"
            text="Aparece no feed de quem é da área"
            icon="briefcase-outline"
            bg={colors.violet}
            fg={colors.accentText}
            iconBg={colors.bg}
            iconFg={colors.text}
            sub="#1F1A40"
            onPress={() => router.push('/novo/vaga')}
          />
        )}

        {!recruiter && (
          <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#14141A', borderWidth: 1, borderColor: colors.border, marginTop: 6 }}>
            <Ionicons name="link" size={18} color={colors.muted} />
            <T v="small" style={{ flex: 1, color: colors.textSoft, lineHeight: 19 }}>
              Quer divulgar uma vaga? Cole o link externo dela no campo “Link da vaga” ao publicar uma foto ou vídeo.
            </T>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile(p: {
  height: number;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  iconBg: string;
  iconFg: string;
  sub: string;
  border?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={p.onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: p.height,
        borderRadius: 26,
        backgroundColor: p.bg,
        borderWidth: p.border ? 1 : 0,
        borderColor: '#2A2A34',
        padding: 22,
        justifyContent: 'space-between',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: p.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={p.icon} size={26} color={p.iconFg} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: p.fg }}>{p.title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: p.sub }}>{p.text}</Text>
      </View>
    </Pressable>
  );
}
