export const ui = {
  colors: {
    background: '#0A0E17',
    backgroundRaised: '#1A1F30',
    card: '#131824',
    cardRaised: '#192133',
    accent: '#6C8DFF',
    accent2: '#A78BFA',
    gold: '#D6B36C',
    text: '#F1F5F9',
    muted: '#94A3B8',
    line: '#2A3A5C',
    success: '#63E6BE',
    danger: '#FF7D8A',
  },
  spacing: { micro: 8, cardGap: 12, standard: 16, section: 24 },
  icon: 24,
  radius: { small: 12, card: 22, sheet: 28, round: 999 },
} as const;

export type UiTokens = typeof ui;
