const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/money.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { parsePrice } = context.exports;
for (const [input, expected] of [
  ['150000', 150000], ['١٥٠٬٠٠٠', 150000], ['۱۵۰۰۰۰', 150000],
  [' 12,500 ', 12500], ['0', null], ['-50', null], ['', null],
  ['abc100', null], ['12.5', null], ['Infinity', null], ['1e5', null],
  ['1000000000001', null], ['1000000000000', 1000000000000]
]) test('price: ' + JSON.stringify(input), () => assert.equal(parsePrice(input), expected));
