import { Listing } from '../types';

export type ListingRisk = {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
};

const riskyWords = /(عربون|حوّل|تحويل|واتساب|خارج التطبيق|مستعجل|سريع جدًا|بدون فحص)/i;

function medianOf(values: number[]): number {
  const sorted = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  const left = sorted[middle - 1] ?? 0;
  const right = sorted[middle] ?? left;
  return (left + right) / 2;
}

function lowerBound(values: number[], target: number) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((values[middle] ?? Number.POSITIVE_INFINITY) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function medianWithoutListingPrice(sortedPrices: number[], listingPrice: number) {
  const validListingPrice = Number.isFinite(listingPrice) && listingPrice > 0;
  const candidateIndex = validListingPrice ? lowerBound(sortedPrices, listingPrice) : -1;
  const excludedIndex = candidateIndex >= 0 && sortedPrices[candidateIndex] === listingPrice ? candidateIndex : -1;
  const peerCount = sortedPrices.length - (excludedIndex >= 0 ? 1 : 0);
  if (peerCount <= 0) return 0;

  const valueAtPeerIndex = (index: number) => {
    const sourceIndex = excludedIndex >= 0 && index >= excludedIndex ? index + 1 : index;
    return sortedPrices[sourceIndex] ?? 0;
  };

  const middle = Math.floor(peerCount / 2);
  if (peerCount % 2 === 1) return valueAtPeerIndex(middle);
  return (valueAtPeerIndex(middle - 1) + valueAtPeerIndex(middle)) / 2;
}

export function scoreListingRisk(listing: Listing, peerPrices: number[]): ListingRisk {
  let score = 0;
  const reasons: string[] = [];
  const median = medianOf(peerPrices);

  if (!listing.verified) {
    score += 18;
    reasons.push('البائع غير موثّق');
  }
  if (median > 0 && listing.price < median * 0.45) {
    score += 38;
    reasons.push('السعر أقل بكثير من المعتاد في الفئة');
  } else if (median > 0 && listing.price < median * 0.65) {
    score += 20;
    reasons.push('السعر أقل من متوسط السوق بشكل ملحوظ');
  }
  if (listing.description.trim().length < 35) {
    score += 12;
    reasons.push('الوصف قصير ولا يوضح تفاصيل كافية');
  }
  if (riskyWords.test(`${listing.title} ${listing.description}`)) {
    score += 28;
    reasons.push('النص يتضمن طلبات أو عبارات تستحق التحقق');
  }
  if (listing.price <= 0 || !Number.isFinite(listing.price)) {
    score = 100;
    reasons.push('السعر غير صالح');
  }

  score = Math.min(100, Math.max(0, score));
  return { score, level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low', reasons };
}

export function rankRiskyListings(listings: Listing[]) {
  const activeListings = listings.filter((listing) => listing.status === 'active');
  const sortedPricesByCategory = new Map<Listing['category'], number[]>();

  for (const listing of activeListings) {
    if (!Number.isFinite(listing.price) || listing.price <= 0) continue;
    const prices = sortedPricesByCategory.get(listing.category) ?? [];
    prices.push(listing.price);
    sortedPricesByCategory.set(listing.category, prices);
  }
  for (const prices of sortedPricesByCategory.values()) prices.sort((a, b) => a - b);

  return activeListings
    .map((listing) => {
      const prices = sortedPricesByCategory.get(listing.category) ?? [];
      const peerMedian = medianWithoutListingPrice(prices, listing.price);
      return { listing, risk: scoreListingRisk(listing, peerMedian > 0 ? [peerMedian] : []) };
    })
    .sort((a, b) => b.risk.score - a.risk.score);
}
