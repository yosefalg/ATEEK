export const ui = {
  colors: {
    background: '#090A0F',
    card: '#13151F',
    cardRaised: '#171A24',
    accent: '#E8B058',
    text: '#F7F8FB',
    muted: '#8F98A8',
    line: 'rgba(255,255,255,0.10)',
    success: '#66D9A7',
    danger: '#FF7B86',
  },
  spacing: { micro: 8, standard: 16, section: 24 },
  icon: 24,
  radius: { small: 12, card: 16, sheet: 24, round: 999 },
} as const;

export type UiTokens = typeof ui;
