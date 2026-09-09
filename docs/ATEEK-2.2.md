# ATEEK 2.2 — Enhancement Pack

ATEEK 2.2 builds on the verified APK-only 2.1 production pipeline and keeps the existing Supabase Auth/RLS contracts intact.

## Delivered in the 2.2 baseline

- New blue/gold visual system: `#0A0E17` → `#1A1F30`, accent `#6C8DFF`, secondary accent `#A78BFA`, gold brand accent `#D6B36C`.
- Glass-style bottom navigation with 24px icons and reduced-motion aware press feedback.
- Dynamic root background using the already-shipped `Animated`, `expo-linear-gradient`, and `expo-sensors` stack: two slow parallax ellipses plus 12 lightweight particles.
- Background effects automatically stop when the existing low-data mode is enabled or when animations are disabled.
- Existing ATEEK AI Hub, secure server-side OpenAI integration, listing text enhancement, Vision classification, and smart reply suggestions are preserved rather than replaced by a client-side AI SDK.
- Existing real Supabase offer/auction/review primitives are preserved; no fake wallet, payment, or reputation metrics are introduced.
- Production remains APK-only, arm64-v8a, Hermes, `adjustResize`, and no AAB artifact.

## Deliberately not added to the 2.2 baseline

The first 2.2 production build does **not** add Skia, MMKV, react-native-fast-image, or FlashList merely for branding/performance. Each would add native surface area and potentially increase APK size or regression risk. The current implementation reuses dependencies already validated by the 2.1 release and keeps the APK target at 35 MiB.

Voice search, a server-authoritative points wallet, expiring listings, and new commercial accounting remain gated until their backend event model and abuse controls are implemented end-to-end. No UI-only or mock versions are shipped.

## Release contract

- Version: 2.2.0
- Android versionCode: 16
- ABI: arm64-v8a only
- Artifact: `ATEEK-INSTALLABLE-APK-ARM64`
- AAB: disabled
- APK budget: <= 35 MiB
- CI quality gates: transforms, production contract, TypeScript, i18n, tests, Expo Doctor, Android export, prebuild, native hardening, Gradle `assembleRelease`, APK identity/ABI verification, APKAnalyzer metrics.

Physical-device QA is required before public beta sign-off and is not inferred from CI success.
