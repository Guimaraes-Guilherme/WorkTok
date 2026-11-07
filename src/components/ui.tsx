import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { initials } from '../lib/format';
import { colors, fonts, radius } from '../lib/theme';

// ---------- Texto ----------
type Variant = 'body' | 'small' | 'label' | 'title' | 'display' | 'strong';
const variants: Record<Variant, TextStyle> = {
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent, letterSpacing: 1 },
  strong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  display: { fontFamily: fonts.display, fontSize: 32, color: colors.text, letterSpacing: -1, lineHeight: 36 },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[variants[v], style]} />;
}

// ---------- Botão ----------
type ButtonKind = 'primary' | 'light' | 'ghost' | 'dark' | 'danger';
export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  icon,
  style,
  height = 54,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const bg = { primary: colors.accent, light: colors.text, ghost: 'transparent', dark: colors.surface2, danger: 'transparent' }[kind];
  const fg = { primary: colors.accentText, light: colors.bg, ghost: colors.text, dark: colors.text, danger: colors.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.lg,
          backgroundColor: bg,
          borderWidth: kind === 'ghost' || kind === 'danger' ? 1 : 0,
          borderColor: kind === 'danger' ? colors.danger : colors.borderStrong,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 18,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- Botão só de ícone ----------
export function IconButton({
  name,
  onPress,
  label,
  size = 22,
  color = colors.text,
  bg,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

// ---------- Chip ----------
export function Chip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  const content = (
    <Text
      style={{
        fontFamily: selected ? fonts.semibold : fonts.medium,
        fontSize: small ? 13 : 15,
        color: selected ? colors.accentText : colors.text,
      }}
    >
      {label}
    </Text>
  );
  const style: ViewStyle = {
    height: small ? 32 : 44,
    paddingHorizontal: small ? 12 : 18,
    borderRadius: radius.pill,
    backgroundColor: selected ? colors.accent : small ? colors.surface : 'transparent',
    borderWidth: selected ? 0 : 1,
    borderColor: small ? colors.border : colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={style}>
      {content}
    </Pressable>
  );
}

// ---------- Campo de texto ----------
export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <T v="small">{label}</T>}
      <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        style={[
          {
            minHeight: 52,
            paddingHorizontal: 16,
            paddingVertical: rest.multiline ? 14 : 0,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: 15,
            textAlignVertical: rest.multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
    </View>
  );
}

// ---------- Avatar ----------
const avatarColors = [colors.violet, '#4DD9FF', '#FF8A3D', colors.accent, '#C6A2FF'];
export function Avatar({ url, name, size = 44, ring }: { url?: string | null; name: string; size?: number; ring?: boolean }) {
  const color = avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: ring ? 2 : 0,
        borderColor: colors.text,
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.36, color: colors.accentText }}>{initials(name)}</Text>
      )}
    </View>
  );
}

// ---------- Cabeçalho simples com voltar ----------
export function Header({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <IconButton name="chevron-back" label="Voltar" onPress={onBack ?? (() => router.back())} />
      <T v="strong" style={{ flex: 1, fontSize: 17 }} numberOfLines={1}>
        {title ?? ''}
      </T>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

// ---------- Estado vazio ----------
export function Empty({ icon, title, text, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <T v="strong" style={{ fontSize: 17, textAlign: 'center' }}>{title}</T>
      {text && <T v="small" style={{ textAlign: 'center', lineHeight: 19 }}>{text}</T>}
      {action}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
});
