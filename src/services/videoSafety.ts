export type ReelVideoInput = {
  playback_url?: string | null;
  hls_url?: string | null;
  media_provider?: 'supabase' | 'cloudinary' | string | null;
};

export type SafeVideoSource = { uri: string; kind: 'hls' | 'file' };

function parseHttps(value?: string | null) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048 || /[\u0000-\u001f\s]/.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '127.0.0.1' || host === '0.0.0.0') return null;
    return u;
  } catch {
    return null;
  }
}

export function resolveReelVideoSource(input: ReelVideoInput): SafeVideoSource | null {
  const hls = parseHttps(input.hls_url);
  if (hls && hls.pathname.toLowerCase().endsWith('.m3u8')) {
    if (input.media_provider === 'cloudinary' && hls.hostname.toLowerCase() !== 'res.cloudinary.com') return null;
    return { uri: hls.toString(), kind: 'hls' };
  }
  const playback = parseHttps(input.playback_url);
  if (!playback) return null;
  return { uri: playback.toString(), kind: 'file' };
}
