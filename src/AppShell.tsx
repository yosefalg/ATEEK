import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import OnlineApp from './cloud/OnlineApp';
import { colors } from './theme/colors';
import { ATEEK_BRAND } from './config/brand';

type State = { failed: boolean };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('ATEEK UI error', error);
  }

  reset = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.brand}>ATEEK • عتيك</Text>
          <Text style={styles.title}>حدث خطأ غير متوقع في الواجهة</Text>
          <Text style={styles.body}>بيانات حسابك محفوظة في الخدمة السحابية. جرّب إعادة فتح الواجهة، وإن استمر الخطأ أغلق التطبيق وافتحه مجددًا.</Text>
          <Pressable accessibilityRole="button" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>إعادة فتح الواجهة</Text>
          </Pressable>
          <Text style={styles.footer}>{ATEEK_BRAND.founderName} • {ATEEK_BRAND.release}</Text>
        </View>
      </SafeAreaView>
    );
  }
}

export default function AppShell() {
  return <AppErrorBoundary><OnlineApp /></AppErrorBoundary>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.paper, borderRadius: 26, padding: 22, gap: 14, borderWidth: 1, borderColor: colors.line },
  brand: { color: colors.gold, fontWeight: '900', textAlign: 'right', fontSize: 16 },
  title: { color: colors.forest, fontWeight: '900', textAlign: 'right', fontSize: 22 },
  body: { color: colors.ink, textAlign: 'right', lineHeight: 24, fontSize: 14 },
  button: { minHeight: 50, backgroundColor: colors.gold, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.forest, fontWeight: '900' },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 10, marginTop: 4 },
});
