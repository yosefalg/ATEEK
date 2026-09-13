import { supabase } from '../cloud/client';

type Listener = (userId?: string) => void;
const listeners = new Set<Listener>();

export function openSpatialProfile(userId?: string) {
  if (userId) void supabase.rpc('ateek_profile_view', { p_profile: userId });
  for (const listener of [...listeners]) {
    try {
      listener(userId);
    } catch {
      // A stale or broken subscriber must not block profile navigation for others.
    }
  }
}

export function subscribeSpatialProfile(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
