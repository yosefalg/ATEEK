// Safe local-development defaults. GitHub Actions overwrites shortSha for the exact APK commit.
export const BUILD_INFO = { versionName: '1.6.0', versionCode: 9, shortSha: 'local' } as const;
