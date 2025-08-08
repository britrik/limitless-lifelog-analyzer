const fs = require('fs');

function patchFile(path, transform) {
  if (!fs.existsSync(path)) return;
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

// 1) Dashboard.tsx: rename unused var, add displayName
patchFile('src/pages/Dashboard.tsx', s => {
  s = s.replace(/const\s*\[\s*transcripts\s*,\s*setTranscripts\s*\]/, 'const [_transcripts, setTranscripts]');
  if (!s.includes('Dashboard.displayName')) s += '\nDashboard.displayName = "Dashboard";\n';
  return s;
});

// 2) Layout.tsx: Sidebar default import
patchFile('src/components/Layout.tsx', s =>
  s.replace(/import\s*{\s*Sidebar\s*}\s*from\s*['"]\.\/Sidebar['"];?/, 'import Sidebar from "./Sidebar";')
);

// 3) tsconfig.json: ensure single esModuleInterop=true
if (fs.existsSync('tsconfig.json')) {
  const j = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  j.compilerOptions = Object.assign({}, j.compilerOptions, { esModuleInterop: true });
  fs.writeFileSync('tsconfig.json', JSON.stringify(j, null, 2));
}
