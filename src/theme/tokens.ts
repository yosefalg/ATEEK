export const ui = {
  colors: {
    background: '#07090D',
    card: '#10151C',
    cardRaised: '#161C25',
    accent: '#D6B36C',
    text: '#F7F9FC',
    muted: '#98A2B3',
    line: 'rgba(214,179,108,0.20)',
    success: '#63E6BE',
    danger: '#FF7D8A',
  },
  spacing: { micro: 8, standard: 16, section: 24 },
  icon: 24,
  radius: { small: 12, card: 22, sheet: 28, round: 999 },
} as const;

export type UiTokens = typeof ui;
