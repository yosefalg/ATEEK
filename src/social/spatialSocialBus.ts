import { supabase } from '../cloud/client';

type Listener = (userId?: string) => void;
const listeners = new Set<Listener>();

export function openSpatialProfile(userId?: string) {
  if (userId) void supabase.rpc('ateek_profile_view', { p_profile: userId });
  for (const listener of listeners) listener(userId);
}

export function subscribeSpatialProfile(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
