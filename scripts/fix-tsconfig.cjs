const fs = require('fs');
const path = 'tsconfig.json';
if (!fs.existsSync(path)) process.exit(0);
let txt = fs.readFileSync(path, 'utf8');

// Remove every existing "esModuleInterop" entry
txt = txt.replace(/,\s*"esModuleInterop"\s*:\s*true/g, '').replace(/"esModuleInterop"\s*:\s*true\s*,?/g, '');

// Ensure compilerOptions exists; inject single esModuleInterop: true
if (!/"compilerOptions"\s*:\s*\{/.test(txt)) {
  txt = txt.replace(/\{\s*/, '{\n  "compilerOptions": { "esModuleInterop": true },\n');
} else {
  txt = txt.replace(/("compilerOptions"\s*:\s*\{)/, '$1 "esModuleInterop": true,');
}

// Replace exclude with TS-safe patterns (no double **)
if (/"exclude"\s*:/.test(txt)) {
  txt = txt.replace(/"exclude"\s*:\s*\[[^\]]*\]/, `"exclude": [
    "src/__tests__",
    "src/utils/dashboardAnalytics.test.ts",
    "e2e"
  ]`);
} else {
  // Insert before final closing brace
  txt = txt.replace(/\}\s*$/, `,\n  "exclude": [\n    "src/__tests__",\n    "src/utils/dashboardAnalytics.test.ts",\n    "e2e"\n  ]\n}\n`);
}

fs.writeFileSync(path, txt);
console.log('tsconfig.json normalised.');
