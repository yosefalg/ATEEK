import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
const xmlDir = path.join(root, 'android/app/src/main/res/xml');
const networkConfigPath = path.join(xmlDir, 'network_security_config.xml');
const gradlePropertiesPath = path.join(root, 'android/gradle.properties');

if (!fs.existsSync(manifestPath)) {
  throw new Error('Run #65 hardening requires Expo prebuild to create AndroidManifest.xml first.');
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/\sandroid:usesCleartextTraffic="[^"]*"/g, '');
manifest = manifest.replace(/\sandroid:networkSecurityConfig="[^"]*"/g, '');
manifest = manifest.replace(
  /<application\b/,
  '<application android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/network_security_config"',
);
fs.writeFileSync(manifestPath, manifest);

fs.mkdirSync(xmlDir, { recursive: true });
fs.writeFileSync(
  networkConfigPath,
  `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false">\n    <trust-anchors>\n      <certificates src="system" />\n    </trust-anchors>\n  </base-config>\n</network-security-config>\n`,
);

let gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
if (/^android\.bundle\.enableUncompressedNativeLibs=/m.test(gradleProperties)) {
  gradleProperties = gradleProperties.replace(
    /^android\.bundle\.enableUncompressedNativeLibs=.*$/m,
    'android.bundle.enableUncompressedNativeLibs=false',
  );
} else {
  gradleProperties += '\nandroid.bundle.enableUncompressedNativeLibs=false\n';
}
fs.writeFileSync(gradlePropertiesPath, gradleProperties);

console.log('Run #65 native hardening applied: cleartext=false, system trust only, compressed native libs.');
