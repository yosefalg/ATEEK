import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { cloudinaryVideoThumbnail, type ReelVideoInput, resolveReelVideoSource } from '../services/videoSafety';
import { useLocale } from '../i18n/LocaleProvider';
import { supabase } from '../cloud/client';
import { ui } from '../theme/tokens';

type Props = { reel: ReelVideoInput; active: boolean };

function logVideoError(reelId: string | undefined | null, message: string) {
  void (async () => {
    try {
      await supabase.rpc('ateek_client_error_log', {
        p_scope: 'reel_video',
        p_entity_id: reelId ?? null,
        p_message: message.slice(0, 1200),
      });
    } catch {
      // Telemetry must never become a second failure path.
    }
  })();
}

function GuardedPlayer({ reel, source, active, failedLabel, retryLabel }: { reel: ReelVideoInput; source: VideoSource; active: boolean; failedLabel: string; retryLabel: string }) {
  const startedAt = useRef(globalThis.performance?.now?.() ?? Date.now());
  const reportedReady = useRef(false);
  const [fallback, setFallback] = useState(false);
  const [retrySerial, setRetrySerial] = useState(0);
  const player = useVideoPlayer(source, (instance) => { instance.loop = true; });
  const event = useEvent(player, 'statusChange', { status: player.status });
  const status = event.status;
  const error = event.error;
  const thumbnail = reel.thumbnail_url ?? cloudinaryVideoThumbnail(reel.hls_url) ?? cloudinaryVideoThumbnail(reel.playback_url);

  useEffect(() => {
    if (status === 'readyToPlay') {
      setFallback(false);
      if (!reportedReady.current) {
        reportedReady.current = true;
        const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - startedAt.current;
        if (__DEV__) console.info(`[ATEEK reels] first-video-ready=${elapsed.toFixed(2)}ms`);
      }
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'error') return;
    const msg = String(error?.message ?? error ?? 'VIDEO_PLAYER_ERROR');
    logVideoError(reel.id, msg);
    setFallback(true);
  }, [status, error, reel.id]);

  useEffect(() => {
    if (fallback || status === 'readyToPlay' || status === 'error') return;
    const timer = setTimeout(() => {
      logVideoError(reel.id, 'VIDEO_READY_TIMEOUT_2000MS');
      setFallback(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [fallback, status, reel.id, retrySerial]);

  useEffect(() => {
    try {
      if (fallback) { player.pause(); return; }
      if (active && status === 'readyToPlay') player.play(); else player.pause();
    } catch (e) {
      logVideoError(reel.id, `VIDEO_CONTROL_ERROR:${String(e)}`);
      setFallback(true);
    }
    return () => { try { player.pause(); } catch { /* Native player may already be released. */ } };
  }, [active, player, status, fallback, reel.id]);

  const retry = async () => {
    startedAt.current = globalThis.performance?.now?.() ?? Date.now();
    reportedReady.current = false;
    setFallback(false);
    setRetrySerial((v) => v + 1);
    try {
      await player.replaceAsync(source);
      if (active) player.play();
    } catch (e) {
      logVideoError(reel.id, `VIDEO_RETRY_ERROR:${String(e)}`);
      setFallback(true);
    }
  };

  if (fallback) return <FallbackCard reel={reel} label={failedLabel} retryLabel={retryLabel} thumbnail={thumbnail} onRetry={() => void retry()} />;
  return <View style={StyleSheet.absoluteFill}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />{status !== 'readyToPlay' && status !== 'error' ? <VideoLoading /> : null}</View>;
}

function VideoLoading() { return <View style={[StyleSheet.absoluteFill, s.loading]}><ActivityIndicator size="small" color={ui.colors.accent} /></View>; }

function FallbackCard({ reel, label, retryLabel, thumbnail, onRetry }: { reel: ReelVideoInput; label: string; retryLabel: string; thumbnail?: string | null; onRetry: () => void }) {
  return <View style={[StyleSheet.absoluteFill, s.invalid]}>{thumbnail ? <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}<View style={s.fallbackShade} /><Ionicons name="image-outline" size={36} color={ui.colors.muted} /><Text style={s.invalidText}>{label}</Text>{!!reel.caption && <Text numberOfLines={3} style={s.caption}>{reel.caption}</Text>}<Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={onRetry} style={s.retry}><Ionicons name="refresh" size={18} color={ui.colors.background} /><Text style={s.retryText}>{retryLabel}</Text></Pressable></View>;
}

export function SafeReelVideo({ reel, active }: Props) {
  const { t } = useLocale();
  const resolved = resolveReelVideoSource(reel);
  if (!resolved) return <View style={[StyleSheet.absoluteFill, s.invalid]}><Ionicons name="videocam-off-outline" size={36} color={ui.colors.muted} /><Text style={s.invalidText}>{t('reels.videoInvalid')}</Text></View>;
  const source: VideoSource = { uri: resolved.uri, contentType: resolved.kind === 'hls' ? 'hls' : 'progressive' };
  return <GuardedPlayer reel={reel} source={source} active={active} failedLabel={t('reels.videoFailed')} retryLabel={t('app.error.retry')} />;
}

const s = StyleSheet.create({
  loading: { backgroundColor: 'rgba(8,11,20,.24)', alignItems: 'center', justifyContent: 'center' },
  invalid: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#141824', padding: 24 },
  fallbackShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,11,20,.64)' },
  invalidText: { fontFamily: 'System', color: '#8A8FA8', fontWeight: '700', textAlign: 'center', writingDirection: 'auto', zIndex: 2 },
  caption: { fontFamily: 'System', color: '#F0F4FF', textAlign: 'center', lineHeight: 20, zIndex: 2 },
  retry: { zIndex: 2, minHeight: 48, borderRadius: 14, backgroundColor: '#C9A86C', paddingHorizontal: 16, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: 'System', color: '#080B14', fontWeight: '900' },
});
