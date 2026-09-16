import * as Haptics from 'expo-haptics';

const safe = (job: Promise<void>) => { void job.catch(() => {}); };

export const haptics = {
  tap() { safe(Haptics.selectionAsync()); },
  light() { safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); },
  medium() { safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); },
  heavy() { safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)); },
  success() { safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)); },
  warning() { safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)); },
  error() { safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)); },
} as const;
