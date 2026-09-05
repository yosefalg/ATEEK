// This file provides safe local-development defaults.
// GitHub Actions overwrites it at build time with the exact commit SHA used for the APK.
export const BUILD_INFO = {
  versionName: '1.2.1',
  versionCode: 4,
  shortSha: 'local',
} as const;
