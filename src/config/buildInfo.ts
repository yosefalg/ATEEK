// Safe local-development defaults. GitHub Actions overwrites shortSha for the exact APK commit.
export const BUILD_INFO = { versionName: '1.8.0', versionCode: 11, shortSha: 'local' } as const;
