import * as Haptics from 'expo-haptics';

const safe = (job: () => Promise<void>) => {
  try {
    void job().catch(() => {});
  } catch {
    // Native capability failures must never interrupt the user action that triggered haptics.
  }
};

export const haptics = {
  tap() { safe(() => Haptics.selectionAsync()); },
  light() { safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); },
  medium() { safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); },
  heavy() { safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)); },
  success() { safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); },
  warning() { safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)); },
  error() { safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)); },
} as const;
