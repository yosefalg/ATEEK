import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAteekTheme } from '../theme/ThemeProvider';

const KEY = 'consents';

type Consents = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

function isStoredConsent(value: unknown): value is Consents {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Consents>;
  return (
    candidate.essential === true &&
    typeof candidate.analytics === 'boolean' &&
    typeof candidate.marketing === 'boolean' &&
    typeof candidate.savedAt === 'string'
  );
}

export function ConsentManager({ children }: PropsWithChildren) {
  const { colors } = useAteekTheme();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!mounted) return;

        if (!raw) {
          setVisible(true);
          return;
        }

        try {
          const parsed: unknown = JSON.parse(raw);
          if (!isStoredConsent(parsed)) {
            setVisible(true);
            return;
          }

          setAnalytics(parsed.analytics);
          setMarketing(parsed.marketing);
        } catch {
          setVisible(true);
        }
      } catch {
        if (mounted) setVisible(true);
      } finally {
        if (mounted) setReady(true);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);

    const value: Consents = {
      essential: true,
      analytics,
      marketing,
      savedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(value));
      setVisible(false);
    } catch {
      Alert.alert('تعذر حفظ الاختيارات', 'تحقق من مساحة التخزين ثم حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.cream }]} accessibilityLabel="جاري تحميل إعدادات الخصوصية">
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.backdrop}>
          <View
            style={[styles.card, { backgroundColor: colors.glassStrong, borderColor: colors.line }]}
            accessibilityViewIsModal
          >
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>إدارة الموافقة</Text>
            <Text style={[styles.body, { color: colors.muted }]}>اختر ما تسمح به. الوظائف الأساسية مطلوبة لتسجيل الدخول وحفظ بيانات السوق.</Text>
            <Row title="أساسية للتشغيل" note="مفعلة دائمًا" value onChange={() => undefined} disabled colors={colors} />
            <Row title="تحليلية" note="قياس الأعطال وتحسين الأداء" value={analytics} onChange={setAnalytics} colors={colors} />
            <Row title="تسويقية" note="إشعارات عروض وحملات مستقبلية" value={marketing} onChange={setMarketing} colors={colors} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="حفظ اختيارات الخصوصية"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={() => void save()}
              style={[styles.button, { backgroundColor: colors.gold }, saving && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator color={colors.forest} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.forest }]}>حفظ الاختيارات</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Row({
  title,
  note,
  value,
  onChange,
  disabled = false,
  colors,
}: {
  title: string;
  note: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  colors: Record<string, string>;
}) {
  return (
    <View style={[styles.row, { borderColor: colors.line }]}>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={title}
        accessibilityHint={note}
      />
      <View style={styles.rowCopy} accessible accessibilityLabel={`${title}. ${note}`}>
        <Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.note, { color: colors.muted }]}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 23, fontWeight: '900', textAlign: 'right' },
  body: { lineHeight: 21, textAlign: 'right' },
  row: { minHeight: 64, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  rowCopy: { flex: 1 },
  rowTitle: { fontWeight: '900', textAlign: 'right' },
  note: { fontSize: 11, textAlign: 'right', marginTop: 3 },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontWeight: '900' },
});
