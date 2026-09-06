import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ReelVideoInput, resolveReelVideoSource } from '../services/videoSafety';
import { useLocale } from '../i18n/LocaleProvider';
import { ui } from '../theme/tokens';

type Props = { reel: ReelVideoInput; active: boolean };

function GuardedPlayer({ uri, active, failedLabel }: { uri: string; active: boolean; failedLabel: string }) {
  const startedAt = useRef(globalThis.performance?.now?.() ?? Date.now());
  const reportedReady = useRef(false);
  const sought = useRef(false);
  const player = useVideoPlayer(uri, (p) => { p.loop = true; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (status === 'readyToPlay' && !reportedReady.current) {
      reportedReady.current = true;
      const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - startedAt.current;
      if (__DEV__) console.info(`[ATEEK reels] first-video-ready=${elapsed.toFixed(2)}ms`);
    }
  }, [status]);

  useEffect(() => {
    if (active && status === 'readyToPlay' && !sought.current) {
      sought.current = true;
      player.currentTime = 2;
    }
    if (active) player.play(); else player.pause();
    return () => player.pause();
  }, [active, player, status]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
      {status !== 'readyToPlay' && status !== 'error' ? <VideoSkeleton /> : null}
      {status === 'error' ? <InvalidVideo label={failedLabel} /> : null}
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
  const { t } = useLocale();
  const source = resolveReelVideoSource(reel);
  if (!source) return <InvalidVideo label={t('reels.videoInvalid')} />;
  return <GuardedPlayer key={source.uri} uri={source.uri} active={active} failedLabel={t('reels.videoFailed')} />;
}

const s = StyleSheet.create({
  skeleton: { backgroundColor: ui.colors.card, justifyContent: 'flex-end', gap: 10, padding: ui.spacing.standard },
  skeletonBar: { height: 12, width: '78%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,.10)' },
  invalid: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: ui.colors.card },
  invalidText: { color: ui.colors.muted, fontWeight: '700', textAlign: 'center', writingDirection: 'auto' },
});
