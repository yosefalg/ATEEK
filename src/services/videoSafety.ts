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
  const [a, b, c] = octets;
  if (a === undefined || b === undefined || c === undefined) return false;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string) {
  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!normalized.includes(':')) return false;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (/^fe[cdef]/.test(normalized)) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized === '2001:db8::' || normalized.startsWith('2001:db8:')) return true;
  // IPv4-mapped IPv6 literals can encode loopback/private IPv4 in hexadecimal
  // (for example ::ffff:7f00:1). Reels never need literal mapped addresses,
  // so fail closed instead of attempting partial textual IPv4 decoding here.
  if (normalized.startsWith('::ffff:')) return true;
  return false;
}

function isReservedHostname(host: string) {
  return (
    host === 'home.arpa' ||
    host.endsWith('.home.arpa') ||
    host === 'test' ||
    host.endsWith('.test') ||
    host === 'invalid' ||
    host.endsWith('.invalid') ||
    host === 'example' ||
    host.endsWith('.example')
  );
}

function isLocalNetworkHost(hostname: string) {
  // URL.hostname preserves an explicit DNS root dot (for example localhost.).
  // Canonicalize it before local-name checks so equivalent local aliases cannot
  // bypass the media URL guard.
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'localdomain' ||
    host.endsWith('.localdomain') ||
    host.endsWith('.local') ||
    isReservedHostname(host) ||
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
    // Reel media is served by the production HTTPS origins on the standard TLS
    // endpoint. Reject explicit non-default ports so untrusted listing media
    // cannot turn playback/thumbnail requests into arbitrary service probes.
    if (u.port && u.port !== '443') return null;
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
