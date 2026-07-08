// 由 icons/icon.svg 渲染出扩展所需的多尺寸 PNG（16/32/48/128）。
// 想换图标：直接编辑 icons/icon.svg，再运行 `node scripts/generate-icons.mjs`。
// 产物提交入库，由 manifest 引用、CRXJS 打包（Chrome 图标只认 PNG，故 SVG 需先光栅化）。
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = resolve(root, 'icons');
const svg = readFileSync(resolve(iconsDir, 'icon.svg'), 'utf8');

mkdirSync(iconsDir, { recursive: true });

// 含 256：高分屏/管理页放大显示时给浏览器更清晰的源，避免放大糊
for (const size of [16, 32, 48, 128, 256]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), png);
}
console.log('[generate-icons] icons/icon.svg → icon-16/32/48/128/256.png');
