import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemeColors, useAteekTheme } from '../theme/ThemeProvider';

export type AuthPortalProps = {
  register: boolean;
  email: string;
  password: string;
  name: string;
  busy: boolean;
  error: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onName: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
};

export function AuthPortal(props: AuthPortalProps) {
  const { colors, animationsEnabled } = useAteekTheme();
  const opacity = useSharedValue(1);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = 0.72;
    y.value = 12;
    opacity.value = withTiming(1, { duration: 280 });
    y.value = withTiming(0, { duration: 320 });
  }, [props.register, animationsEnabled, opacity, y]);

  const motion = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  const title = props.register ? 'أنشئ حسابك في عتيك' : 'مرحبًا بعودتك';
  const subtitle = props.register
    ? 'ابدأ البيع والشراء والتفاوض من حساب واحد آمن.'
    : 'سجّل الدخول للعودة إلى إعلاناتك ومحادثاتك ومفضلاتك.';

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.surface }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.panel, { backgroundColor: colors.glassStrong, borderColor: colors.line }, motion]}>
          <View style={[styles.logoOrb, { backgroundColor: colors.forestSoft, borderColor: colors.line }]} accessible accessibilityRole="image" accessibilityLabel="شعار عتيك">
            <Text style={[styles.logo, { color: colors.gold }]}>ع</Text>
          </View>
          <Text style={[styles.brand, { color: colors.gold }]}>عتيك</Text>
          <Text style={[styles.tagline, { color: colors.goldSoft }]}>كل شيء له قيمة</Text>

          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
          </View>

          {props.register && (
            <Field
              icon="person-outline"
              label="الاسم"
              placeholder="اسمك"
              value={props.name}
              onChangeText={props.onName}
              maxLength={60}
              colors={colors}
            />
          )}

          <Field
            icon="mail-outline"
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            value={props.email}
            onChangeText={props.onEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={254}
            colors={colors}
          />

          <Field
            icon="lock-closed-outline"
            label="كلمة المرور"
            placeholder="10 أحرف على الأقل"
            value={props.password}
            onChangeText={props.onPassword}
            secureTextEntry
            autoCapitalize="none"
            maxLength={128}
            colors={colors}
          />

          {!!props.error && (
            <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={[styles.error, { color: colors.danger }]}>{props.error}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.register ? 'إنشاء حساب عتيك' : 'تسجيل الدخول إلى عتيك'}
            accessibilityState={{ disabled: props.busy, busy: props.busy }}
            disabled={props.busy}
            onPress={props.onSubmit}
            style={({ pressed }) => [styles.primary, { backgroundColor: colors.gold }, pressed && !props.busy && styles.pressed, props.busy && styles.disabled]}
          >
            {props.busy ? <ActivityIndicator color={colors.forest} /> : <Ionicons name={props.register ? 'person-add-outline' : 'arrow-forward-outline'} size={20} color={colors.forest} />}
            <Text style={[styles.primaryText, { color: colors.forest }]}>{props.busy ? 'جارٍ الاتصال…' : props.register ? 'إنشاء الحساب' : 'دخول'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.register ? 'لدي حساب بالفعل' : 'إنشاء حساب جديد'}
            disabled={props.busy}
            onPress={props.onToggleMode}
            style={({ pressed }) => [styles.secondary, { borderColor: colors.line }, pressed && !props.busy && styles.pressed]}
          >
            <Text style={[styles.secondaryText, { color: colors.ink }]}>{props.register ? 'لدي حساب بالفعل' : 'إنشاء حساب جديد'}</Text>
          </Pressable>

          <View style={[styles.trust, { borderTopColor: colors.line }]}>
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.success} />
            <Text style={[styles.trustText, { color: colors.muted }]}>تسجيل الدخول محمي عبر Supabase Auth ولا تُحفظ كلمة المرور داخل التطبيق.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, colors, ...props }: ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: colors.glass, borderColor: colors.line }]}>
        <Ionicons name={icon} size={19} color={colors.gold} />
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          textAlign="right"
          style={[styles.input, { color: colors.ink }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  panel: { borderWidth: 1, borderRadius: 30, padding: 22, gap: 14, shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  logoOrb: { alignSelf: 'center', width: 72, height: 72, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 42, fontWeight: '900' },
  brand: { textAlign: 'center', fontSize: 34, fontWeight: '900', letterSpacing: 0.4 },
  tagline: { textAlign: 'center', fontSize: 13, fontWeight: '700' },
  heroCopy: { marginTop: 8, marginBottom: 2, gap: 6 },
  title: { textAlign: 'right', fontSize: 25, fontWeight: '900' },
  subtitle: { textAlign: 'right', fontSize: 13, lineHeight: 21 },
  field: { gap: 7 },
  label: { textAlign: 'right', fontSize: 12, fontWeight: '800' },
  inputShell: { minHeight: 54, borderWidth: 1, borderRadius: 17, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, minHeight: 52, fontSize: 15 },
  errorRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 },
  error: { flex: 1, textAlign: 'right', lineHeight: 20, fontSize: 12, fontWeight: '700' },
  primary: { minHeight: 56, borderRadius: 18, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { fontWeight: '900', fontSize: 16 },
  secondary: { minHeight: 50, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryText: { fontWeight: '800', fontSize: 14 },
  trust: { marginTop: 2, paddingTop: 14, borderTopWidth: 1, flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' },
  trustText: { flex: 1, textAlign: 'right', fontSize: 11, lineHeight: 18 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  disabled: { opacity: 0.55 },
});
