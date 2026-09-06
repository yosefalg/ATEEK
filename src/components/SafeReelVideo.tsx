import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ReelVideoInput, resolveReelVideoSource } from '../services/videoSafety';
import { ui } from '../theme/tokens';

type Props = { reel: ReelVideoInput; active: boolean };

function GuardedPlayer({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (active) player.play(); else player.pause();
    return () => player.pause();
  }, [active, player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
      {status !== 'readyToPlay' && status !== 'error' ? <VideoSkeleton /> : null}
      {status === 'error' ? <InvalidVideo label="تعذر تشغيل الفيديو بأمان" /> : null}
    </View>
  );
}

function VideoSkeleton() {
  return (
    <View style={[StyleSheet.absoluteFill, s.skeleton]}>
      <View style={s.skeletonBar} />
      <View style={[s.skeletonBar, { width: '54%' }]} />
    </View>
  );
}

function InvalidVideo({ label }: { label: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, s.invalid]}>
      <Ionicons name="videocam-off-outline" size={38} color={ui.colors.muted} />
      <Text style={s.invalidText}>{label}</Text>
    </View>
  );
}

export function SafeReelVideo({ reel, active }: Props) {
  const source = resolveReelVideoSource(reel);
  if (!source) return <InvalidVideo label="رابط الفيديو غير صالح أو غير آمن" />;
  return <GuardedPlayer key={source.uri} uri={source.uri} active={active} />;
}

const s = StyleSheet.create({
  skeleton: { backgroundColor: ui.colors.card, justifyContent: 'flex-end', gap: 10, padding: ui.spacing.standard },
  skeletonBar: { height: 12, width: '78%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,.10)' },
  invalid: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: ui.colors.card },
  invalidText: { color: ui.colors.muted, fontWeight: '700', textAlign: 'center' },
});
