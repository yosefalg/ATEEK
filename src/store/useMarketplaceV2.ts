import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { seedListings } from '../data/seed';
import { Listing, Offer } from '../types';
export interface Message { id: string; listingId: string; text: string; createdAt: number }
interface State { listings: Listing[]; favorites: string[]; offers: Offer[]; messages: Message[]; name: string }
const KEY = '@ateek/state-v2';
const initial: State = { listings: seedListings.map(x => ({ ...x, verified: false })), favorites: [], offers: [], messages: [], name: 'يوسف' };
const uid = () => Date.now() + '-' + Math.random().toString(36).slice(2, 9);
function isListing(x: any): x is Listing {
  return x && typeof x.id === 'string' && typeof x.title === 'string' && typeof x.description === 'string'
    && typeof x.location === 'string' && typeof x.seller === 'string' && typeof x.image === 'string'
    && typeof x.price === 'number' && Number.isFinite(x.price) && x.price > 0;
}
export function useMarketplace() {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [writable, setWritable] = useState(false);
  const queue = useRef(Promise.resolve());
  const reload = useCallback(async () => {
    setReady(false); setWritable(false); setError('');
    try {
      const raw = await AsyncStorage.getItem(KEY);
      let data: any;
      if (raw) data = JSON.parse(raw);
      else {
        const legacy = await AsyncStorage.multiGet(['@ateek/listings', '@ateek/favorites', '@ateek/offers']);
        data = { ...initial, listings: legacy[0]?.[1] ? JSON.parse(legacy[0][1]) : initial.listings,
          favorites: legacy[1]?.[1] ? JSON.parse(legacy[1][1]) : [], offers: legacy[2]?.[1] ? JSON.parse(legacy[2][1]) : [] };
      }
      if (!Array.isArray(data.listings) || !data.listings.every(isListing)
        || !Array.isArray(data.favorites) || !data.favorites.every((x: unknown) => typeof x === 'string')
        || !Array.isArray(data.offers) || !data.offers.every((x: any) => x && typeof x.id === 'string' && typeof x.listingId === 'string' && Number.isFinite(x.amount))
        || (data.messages !== undefined && (!Array.isArray(data.messages) || !data.messages.every((x: any) => x && typeof x.id === 'string' && typeof x.text === 'string' && typeof x.listingId === 'string' && Number.isFinite(x.createdAt))))) throw new Error('Invalid data');
      setState({ ...data, listings: data.listings.map((x: Listing) => ({ ...x, verified: false })), messages: data.messages ?? [], name: typeof data.name === 'string' ? data.name : 'يوسف' });
      setWritable(true);
    } catch { setError('تعذّر قراءة البيانات. لم نستبدل ملفاتك. أعد المحاولة.'); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!ready || !writable) return;
    const snapshot = JSON.stringify(state);
    queue.current = queue.current.then(() => AsyncStorage.setItem(KEY, snapshot))
      .then(() => setError('')).catch(() => setError('تعذّر الحفظ على الجهاز. اضغط إعادة الحفظ.'));
  }, [state, ready, writable]);
  const toggleFavorite = (id: string) => setState(s => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id] }));
  const addListing = (item: Listing) => setState(s => ({ ...s, listings: [{ ...item, seller: s.name, owner: true, verified: false }, ...s.listings] }));
  const makeOffer = (listingId: string, amount: number) => {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    setState(s => ({ ...s, offers: [{ id: uid(), listingId, amount, status: 'قيد التفاوض' }, ...s.offers] }));
  };
  const sendMessage = (listingId: string, text: string) => {
    if (!text.trim()) return;
    setState(s => ({ ...s, messages: [...s.messages, { id: uid(), listingId, text: text.trim().slice(0, 2000), createdAt: Date.now() }] }));
  };
  const removeListing = (id: string) => setState(s => ({ ...s, listings: s.listings.filter(x => x.id !== id || !(x.owner || x.seller === 'يوسف')) }));
  return { ...state, ready, error, writable, reload, toggleFavorite, addListing, makeOffer, sendMessage, removeListing,
    retrySave: () => setState(s => ({ ...s })),
    saveName: (name: string) => { if (name.trim()) setState(s => ({ ...s, name: name.trim().slice(0, 60) })); },
    withdrawOffer: (id: string) => setState(s => ({ ...s, offers: s.offers.filter(x => x.id !== id) })) };
}
export type Marketplace = ReturnType<typeof useMarketplace>;
