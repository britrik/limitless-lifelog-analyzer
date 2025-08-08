const fs = require('fs');
const IGNORES = ["src/__tests__/**", "src/utils/dashboardAnalytics.test.ts"];

function unique(arr){ return Array.from(new Set(arr)); }

try {
  const cfg = require(process.cwd() + "/eslint.config.js");
  cfg.ignores = unique([...(cfg.ignores || []), ...IGNORES]);
  fs.writeFileSync("eslint.config.js", "module.exports = " + JSON.stringify(cfg, null, 2) + "\n");
} catch (e) {
  if (fs.existsSync("eslint.config.js")) {
    let txt = fs.readFileSync("eslint.config.js", "utf8");
    if (!/ignores\s*:/.test(txt)) {
      txt = txt.replace(/\}\s*;?\s*$/, `, ignores: ${JSON.stringify(IGNORES, null, 2)}\n}\n`);
      fs.writeFileSync("eslint.config.js", txt);
    }
  }
}

if (fs.existsSync(".eslintignore") && !fs.existsSync(".eslintignore.bak")) {
  try { fs.renameSync(".eslintignore", ".eslintignore.bak"); } catch (_) {}
}
