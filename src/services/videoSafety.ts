export type ReelVideoInput = {
  id?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  hls_url?: string | null;
  media_provider?: 'supabase' | 'cloudinary' | string | null;
};

export type SafeVideoSource = { uri: string; kind: 'hls' | 'file' };

function isPrivateIpv4(host: string) {
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return false;
  const [a, b] = octets;
  if (a === undefined || b === undefined) return false;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string) {
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!normalized.includes(':')) return false;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isPrivateIpv4(mapped);
  }
  return false;
}

function isLocalNetworkHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  );
}

function parseHttps(value?: string | null) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048 || /[\u0000-\u001f\s]/.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
    if (isLocalNetworkHost(u.hostname)) return null;
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
  if (input.media_provider === 'cloudinary' && playback.hostname.toLowerCase() !== 'res.cloudinary.com') return null;
  return { uri: playback.toString(), kind: 'file' };
}

export function cloudinary720(uri: string) {
  const u = parseHttps(uri);
  if (!u || u.hostname.toLowerCase() !== 'res.cloudinary.com' || !u.pathname.includes('/video/upload/')) return null;
  u.pathname = u.pathname.replace('/video/upload/', '/video/upload/f_auto,q_auto,w_1280,h_720,c_limit/');
  return u.toString();
}

export function cloudinaryVideoThumbnail(uri?: string | null) {
  const u = parseHttps(uri);
  if (!u || u.hostname.toLowerCase() !== 'res.cloudinary.com') return null;
  const marker = '/video/upload/';
  const at = u.pathname.indexOf(marker);
  if (at < 0) return null;
  const prefix = u.pathname.slice(0, at + marker.length);
  const tail = u.pathname.slice(at + marker.length);
  const segments = tail.split('/').filter(Boolean);
  while (segments.length) {
    const first = segments[0];
    if (!first || !/^(sp_|f_|q_|w_|h_|c_|so_)/.test(first)) break;
    segments.shift();
  }
  if (!segments.length) return null;
  const last = segments.length - 1;
  const current = segments[last];
  if (!current) return null;
  let thumbnailName = current.replace(/\.(m3u8|mp4|mov|webm)$/i, '.jpg');
  if (!/\.jpg$/i.test(thumbnailName)) thumbnailName += '.jpg';
  segments[last] = thumbnailName;
  u.pathname = `${prefix}so_1,w_720,c_limit,f_jpg,q_auto/${segments.join('/')}`;
  u.search = '';
  u.hash = '';
  return u.toString();
}
