export const ATEEK_BRAND = {
  appName: 'عتيك',
  latinName: 'ATEEK',
  tagline: 'كل شيء له قيمة',
  founderName: 'YOSEF HASON ALI',
  founderEmail: 'yosecalgbore@gmail.com',
  country: 'العراق',
  release: '1.2.0',
} as const;

export function isFounderEmail(email?: string | null) {
  return email?.trim().toLowerCase() === ATEEK_BRAND.founderEmail.toLowerCase();
}
