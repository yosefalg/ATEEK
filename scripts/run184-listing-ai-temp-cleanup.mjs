import fs from 'node:fs';

const file = 'src/screens/AddListingScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run184 transform anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "    setAnalyzing(true);\n    try {\n      const compressed = await ImageManipulator.manipulateAsync(image, [{ resize: { width: 900 } }], { compress: 0.58, format: ImageManipulator.SaveFormat.JPEG });\n      const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });",
  "    setAnalyzing(true);\n    let compressedUri: string | null = null;\n    try {\n      const compressed = await ImageManipulator.manipulateAsync(image, [{ resize: { width: 900 } }], { compress: 0.58, format: ImageManipulator.SaveFormat.JPEG });\n      compressedUri = compressed.uri;\n      const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });",
  'track AI analysis temporary image',
);

replace(
  "    } finally {\n      setAnalyzing(false);\n    }\n  };\n\n  const publish = async () => {",
  "    } finally {\n      if (compressedUri && compressedUri !== image) {\n        await FileSystem.deleteAsync(compressedUri, { idempotent: true }).catch(() => {});\n      }\n      setAnalyzing(false);\n    }\n  };\n\n  const publish = async () => {",
  'clean AI analysis temporary image',
);

fs.writeFileSync(file, s);
console.log('Run #184 listing AI reliability applied: temporary analysis images are cleaned after success or failure.');
