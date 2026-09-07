import { Listing } from '../types';

export const categories = [
  { id: 'antiques', label: 'تحف وعتيق', icon: 'diamond-outline' },
  { id: 'scrap', label: 'خردة وسكراب', icon: 'construct-outline' },
  { id: 'electronics', label: 'إلكترونيات', icon: 'phone-portrait-outline' },
  { id: 'furniture', label: 'أثاث', icon: 'bed-outline' },
  { id: 'cars', label: 'سيارات وقطع', icon: 'car-sport-outline' },
  { id: 'collectibles', label: 'مقتنيات', icon: 'albums-outline' }
] as const;

// Deliberately empty: production data comes only from Supabase or persisted user state.
export const seedListings: Listing[] = [];

export const formatPrice = (value: number) => new Intl.NumberFormat('ar-IQ').format(value) + ' د.ع';
