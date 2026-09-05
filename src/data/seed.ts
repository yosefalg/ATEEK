import { Listing } from '../types';

export const categories = [
  { id: 'antiques', label: 'تحف وعتيق', icon: 'diamond-outline' },
  { id: 'scrap', label: 'خردة وسكراب', icon: 'construct-outline' },
  { id: 'electronics', label: 'إلكترونيات', icon: 'phone-portrait-outline' },
  { id: 'furniture', label: 'أثاث', icon: 'bed-outline' },
  { id: 'cars', label: 'سيارات وقطع', icon: 'car-sport-outline' },
  { id: 'collectibles', label: 'مقتنيات', icon: 'albums-outline' }
] as const;

export const seedListings: Listing[] = [
  {
    id: '1', title: 'راديو خشبي عتيق', price: 185000, category: 'antiques', location: 'النجف',
    condition: 'مستعمل ممتاز', age: 'منذ 12 دقيقة', seller: 'كرار النجفي', verified: true,
    image: 'https://images.unsplash.com/photo-1593078165899-c7d2ac0d6aea?auto=format&fit=crop&w=900&q=80',
    description: 'راديو خشبي كلاسيكي بحالة جميلة، قطعة مميزة للديكور والمقتنيات.', createdAt: Date.now() - 720000
  },
  {
    id: '2', title: 'نحاس أصفر للبيع', price: 4200, category: 'scrap', location: 'بغداد',
    condition: 'مستعمل', age: 'منذ ساعة', seller: 'حسين جبار', verified: true,
    image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80',
    description: 'كمية نحاس أصفر نظيفة. السعر للكيلوغرام وقابل للتفاوض للكميات.', createdAt: Date.now() - 3600000
  },
  {
    id: '3', title: 'كاميرا فيلم كلاسيكية', price: 95000, category: 'collectibles', location: 'كربلاء',
    condition: 'مستعمل ممتاز', age: 'منذ ساعتين', seller: 'مصطفى علي', verified: false,
    image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=900&q=80',
    description: 'كاميرا فيلم يابانية أصلية مع الحقيبة، العدسة نظيفة وتعمل يدويًا.', createdAt: Date.now() - 7200000
  },
  {
    id: '4', title: 'طاولة خشب صاج قديمة', price: 240000, category: 'furniture', location: 'الحلة',
    condition: 'مستعمل ممتاز', age: 'منذ اليوم', seller: 'أبو زينب', verified: true,
    image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=900&q=80',
    description: 'طاولة صاج ثقيلة مصنوعة يدويًا، مناسبة للمضيف أو المنزل.', createdAt: Date.now() - 18000000
  }
];

export const formatPrice = (value: number) => new Intl.NumberFormat('ar-IQ').format(value) + ' د.ع';
