// 将 kuromoji 词典从 node_modules 复制到 public/assets/dict，
// 使其经 Vite 打包为扩展内可访问资源（web_accessible_resources: assets/dict/*）。
// 词典体积大（~19MB），不进版本库，由本脚本在 dev/build 前生成。
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/@sglkc/kuromoji/dict');
const dest = resolve(root, 'public/assets/dict');

if (!existsSync(src)) {
  console.error('[copy-dict] 未找到 kuromoji 词典目录:', src);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[copy-dict] 词典已复制到', dest);
