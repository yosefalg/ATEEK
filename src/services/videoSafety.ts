export type ReelVideoInput = {
  id?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
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

export function cloudinary720(uri: string) {
  try {
    const u = new URL(uri);
    if (u.hostname.toLowerCase() !== 'res.cloudinary.com' || !u.pathname.includes('/video/upload/')) return null;
    u.pathname = u.pathname.replace('/video/upload/', '/video/upload/f_auto,q_auto,w_1280,h_720,c_limit/');
    return u.toString();
  } catch { return null; }
}
