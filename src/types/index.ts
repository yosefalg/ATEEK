export type CategoryId = 'antiques' | 'scrap' | 'electronics' | 'furniture' | 'cars' | 'collectibles';

export type ListingCondition = 'جديد' | 'مستعمل ممتاز' | 'مستعمل' | 'يحتاج صيانة';

export interface Listing {
  owner?: boolean;
  sellerId?: string;
  status?: string;
  id: string;
  title: string;
  price: number;
  category: CategoryId;
  location: string;
  condition: ListingCondition;
  age: string;
  image: string;
  seller: string;
  verified: boolean;
  description: string;
  createdAt: number;
}

export interface Offer {
  id: string;
  listingId: string;
  amount: number;
  status: 'قيد التفاوض' | 'مقبول' | 'مرفوض';
}

export type TabId = 'home' | 'search' | 'add' | 'chats' | 'profile';
