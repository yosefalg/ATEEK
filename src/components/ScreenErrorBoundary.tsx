import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUILD_INFO } from '../config/buildInfo';
import { ui } from '../theme/tokens';

type Props = React.PropsWithChildren<{ name: string; resetKey?: string | number | null }>;
type State = { error: Error | null; serial: number };

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, serial: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ATEEK:${this.props.name}] isolated runtime error`, error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  private retry = () => this.setState((s) => ({ error: null, serial: s.serial + 1 }));

  render() {
    if (!this.state.error) return <React.Fragment key={this.state.serial}>{this.props.children}</React.Fragment>;
    return (
      <View style={s.root} accessibilityRole="alert">
        <View style={s.card}>
          <Ionicons name="shield-checkmark-outline" size={36} color={ui.colors.accent} />
          <Text style={s.title}>تم احتواء الخطأ داخل {this.props.name}</Text>
          <Text style={s.body}>لم يتم إغلاق عتيك. يمكنك إعادة تحميل هذه الشاشة فقط دون التأثير في بقية التطبيق.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إعادة تحميل الشاشة" onPress={this.retry} style={s.button}>
            <Ionicons name="refresh" size={ui.icon} color={ui.colors.background} />
            <Text style={s.buttonText}>إعادة تحميل الشاشة</Text>
          </Pressable>
          <Text style={s.meta}>ATEEK {BUILD_INFO.versionName} • #{BUILD_INFO.versionCode} • {BUILD_INFO.shortSha}</Text>
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.colors.background, alignItems: 'center', justifyContent: 'center', padding: ui.spacing.standard },
  card: { width: '100%', maxWidth: 520, backgroundColor: ui.colors.card, borderRadius: ui.radius.sheet, borderWidth: 1, borderColor: ui.colors.line, padding: ui.spacing.section, gap: 14, alignItems: 'center' },
  title: { color: ui.colors.text, fontWeight: '900', fontSize: 20, textAlign: 'center' },
  body: { color: ui.colors.muted, lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 50, width: '100%', borderRadius: ui.radius.card, backgroundColor: ui.colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: ui.colors.background, fontWeight: '900' },
  meta: { color: ui.colors.muted, fontSize: 10 },
});
