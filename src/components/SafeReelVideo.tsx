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
      // Video telemetry must never become a second failure path.
    }
  })();
}

function resolveThumbnail(reel: ReelVideoInput) {
  const directThumbnail = typeof reel.thumbnail_url === 'string' ? reel.thumbnail_url.trim() : '';
  return directThumbnail || cloudinaryVideoThumbnail(reel.hls_url) || cloudinaryVideoThumbnail(reel.playback_url) || null;
}

function GuardedPlayer({ reel, source, active, failedLabel, retryLabel }: { reel: ReelVideoInput; source: VideoSource; active: boolean; failedLabel: string; retryLabel: string }) {
  const startedAt = useRef(globalThis.performance?.now?.() ?? Date.now());
  const reportedReady = useRef(false);
  const retryInFlight = useRef(false);
  const mountedRef = useRef(true);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [fallback, setFallback] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retrySerial, setRetrySerial] = useState(0);
  const player = useVideoPlayer(source, (instance) => { instance.loop = true; });
  const event = useEvent(player, 'statusChange', { status: player.status });
  const status = event.status;
  const error = event.error;
  const thumbnail = resolveThumbnail(reel);

  useEffect(() => () => {
    mountedRef.current = false;
    retryInFlight.current = false;
  }, []);

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
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    startedAt.current = globalThis.performance?.now?.() ?? Date.now();
    reportedReady.current = false;
    setFallback(false);
    setRetrySerial((v) => v + 1);
    try {
      await player.replaceAsync(source);
      if (mountedRef.current && activeRef.current) player.play();
    } catch (e) {
      logVideoError(reel.id, `VIDEO_RETRY_ERROR:${String(e)}`);
      if (mountedRef.current) setFallback(true);
    } finally {
      retryInFlight.current = false;
      if (mountedRef.current) setRetrying(false);
    }
  };

  if (fallback) return <FallbackCard reel={reel} label={failedLabel} retryLabel={retryLabel} thumbnail={thumbnail} onRetry={() => void retry()} retrying={retrying} />;
  return <View style={StyleSheet.absoluteFill}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />{status !== 'readyToPlay' && status !== 'error' ? <VideoLoading /> : null}</View>;
}

function VideoLoading() { return <View style={[StyleSheet.absoluteFill, s.loading]}><ActivityIndicator size="small" color={ui.colors.accent} /></View>; }

function FallbackCard({ reel, label, retryLabel, thumbnail, onRetry, retrying = false }: { reel: ReelVideoInput; label: string; retryLabel: string; thumbnail?: string | null; onRetry?: () => void; retrying?: boolean }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  useEffect(() => setThumbnailFailed(false), [thumbnail]);
  const showThumbnail = !!thumbnail && !thumbnailFailed;
  return <View style={[StyleSheet.absoluteFill, s.invalid]}>{showThumbnail ? <Image accessible={false} importantForAccessibility="no-hide-descendants" source={{ uri: thumbnail! }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setThumbnailFailed(true)} /> : null}<View style={s.fallbackShade} /><Ionicons name={showThumbnail?'image-outline':'videocam-off-outline'} size={36} color={ui.colors.muted} /><Text style={s.invalidText}>{label}</Text>{!!reel.caption && <Text numberOfLines={3} style={s.caption}>{reel.caption}</Text>}{onRetry?<Pressable accessibilityRole="button" accessibilityLabel={retryLabel} accessibilityState={{ disabled: retrying, busy: retrying }} disabled={retrying} onPress={onRetry} style={[s.retry, retrying && s.retryDisabled]}>{retrying?<ActivityIndicator size="small" color={ui.colors.background} />:<Ionicons name="refresh" size={18} color={ui.colors.background} />}<Text style={s.retryText}>{retryLabel}</Text></Pressable>:null}</View>;
}

function InvalidReelFallback({ reel, label, retryLabel }: { reel: ReelVideoInput; label: string; retryLabel: string }) {
  useEffect(() => {
    logVideoError(reel.id, 'VIDEO_SOURCE_INVALID_OR_MISSING');
  }, [reel.id]);
  return <FallbackCard reel={reel} label={label} retryLabel={retryLabel} thumbnail={resolveThumbnail(reel)} />;
}

export function SafeReelVideo({ reel, active }: Props) {
  const { t } = useLocale();
  const resolved = resolveReelVideoSource(reel);
  if (!resolved) {
    return <InvalidReelFallback reel={reel} label={t('reels.videoInvalid')} retryLabel={t('app.error.retry')} />;
  }
  const source: VideoSource = { uri: resolved.uri, contentType: resolved.kind === 'hls' ? 'hls' : 'progressive' };
  return <GuardedPlayer reel={reel} source={source} active={active} failedLabel={t('reels.videoFailed')} retryLabel={t('app.error.retry')} />;
}

const s = StyleSheet.create({
  loading: { backgroundColor: 'rgba(8,11,20,.24)', alignItems: 'center', justifyContent: 'center' },
  invalid: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#10131F', padding: 24 },
  fallbackShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,8,15,.68)' },
  invalidText: { fontFamily: 'System', color: '#A7AFC2', fontWeight: '700', textAlign: 'center', writingDirection: 'auto', zIndex: 2 },
  caption: { fontFamily: 'System', color: '#F7F8FC', textAlign: 'center', lineHeight: 20, zIndex: 2 },
  retry: { zIndex: 2, minHeight: 44, borderRadius: 14, backgroundColor: '#E0B86A', paddingHorizontal: 15, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center' },
  retryDisabled: { opacity: 0.72 },
  retryText: { fontFamily: 'System', color: '#080A10', fontWeight: '900' },
});
