export const ui = {
  colors: {
    background: '#080B14',
    card: '#141824',
    cardRaised: '#1A1F2B',
    accent: '#C9A86C',
    text: '#F0F4FF',
    muted: '#8A8FA8',
    line: 'rgba(201,168,108,0.20)',
    success: '#73F0CF',
    danger: '#FF7B86',
  },
  spacing: { micro: 8, standard: 16, section: 24 },
  icon: 24,
  radius: { small: 12, card: 20, sheet: 24, round: 999 },
} as const;

export type UiTokens = typeof ui;
