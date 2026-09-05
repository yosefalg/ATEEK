import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedListings } from '../data/seed';
import { Listing, Offer } from '../types';

const KEYS = { listings: '@ateek/listings', favorites: '@ateek/favorites', offers: '@ateek/offers' };

export function useMarketplace() {
  const [listings, setListings] = useState<Listing[]>(seedListings);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEYS.listings), AsyncStorage.getItem(KEYS.favorites), AsyncStorage.getItem(KEYS.offers)])
      .then(([savedListings, savedFavorites, savedOffers]) => {
        if (savedListings) setListings(JSON.parse(savedListings));
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        if (savedOffers) setOffers(JSON.parse(savedOffers));
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => { if (ready) AsyncStorage.setItem(KEYS.listings, JSON.stringify(listings)); }, [listings, ready]);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEYS.offers, JSON.stringify(offers)); }, [offers, ready]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }, []);

  const addListing = useCallback((listing: Listing) => setListings(current => [listing, ...current]), []);

  const makeOffer = useCallback((listingId: string, amount: number) => {
    const offer: Offer = { id: Date.now().toString(), listingId, amount, status: 'قيد التفاوض' };
    setOffers(current => [offer, ...current]);
    return offer;
  }, []);

  return useMemo(() => ({ listings, favorites, offers, ready, toggleFavorite, addListing, makeOffer }),
    [listings, favorites, offers, ready, toggleFavorite, addListing, makeOffer]);
}
