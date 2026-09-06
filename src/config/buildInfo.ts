// Safe local-development defaults. GitHub Actions overwrites shortSha for the exact APK commit.
export const BUILD_INFO = { versionName: '1.9.0', versionCode: 12, shortSha: 'local' } as const;
