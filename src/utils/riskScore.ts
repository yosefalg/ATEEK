import { Listing } from '../types';

export type ListingRisk = {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
};

const riskyWords = /(عربون|حوّل|تحويل|واتساب|خارج التطبيق|مستعجل|سريع جدًا|بدون فحص)/i;

export function scoreListingRisk(listing: Listing, peerPrices: number[]): ListingRisk {
  let score = 0;
  const reasons: string[] = [];

  const validPeers = peerPrices.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  const median = validPeers.length
    ? validPeers.length % 2
      ? validPeers[(validPeers.length - 1) / 2]
      : (validPeers[validPeers.length / 2 - 1] + validPeers[validPeers.length / 2]) / 2
    : 0;

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
  return {
    score,
    level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    reasons,
  };
}

export function rankRiskyListings(listings: Listing[]) {
  return listings
    .filter((listing) => listing.status === 'active')
    .map((listing) => {
      const peers = listings
        .filter((other) => other.status === 'active' && other.category === listing.category && other.id !== listing.id)
        .map((other) => other.price);
      return { listing, risk: scoreListingRisk(listing, peers) };
    })
    .sort((a, b) => b.risk.score - a.risk.score);
}
