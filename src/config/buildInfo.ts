// Safe local-development defaults. GitHub Actions overwrites shortSha for the exact APK commit.
export const BUILD_INFO = { versionName: '1.3.0', versionCode: 6, shortSha: 'local' } as const;
