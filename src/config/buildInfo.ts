// Safe local-development defaults. GitHub Actions overwrites shortSha for the exact APK commit.
export const BUILD_INFO = { versionName: '1.4.0', versionCode: 7, shortSha: 'local' } as const;
