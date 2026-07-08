// 把已构建的 dist/ 打成带版本号的 zip（自包含安装包）。
// 用法：pnpm zip → 生成 jp-reading-assistant-<version>.zip
// 安装：解压到固定目录 → chrome://extensions → 开发者模式 → 加载已解压的扩展程序。
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('[zip] 未找到 dist/，请先运行 pnpm build');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const out = resolve(root, `jp-reading-assistant-${pkg.version}.zip`);
rmSync(out, { force: true });

// 在 dist 内打包，使 manifest.json 位于 zip 根目录（Chrome 要求）
execSync(`cd "${dist}" && zip -r -X "${out}" . -x "*.DS_Store"`, { stdio: 'inherit' });
console.log('\n[zip] 安装包已生成：', out);
