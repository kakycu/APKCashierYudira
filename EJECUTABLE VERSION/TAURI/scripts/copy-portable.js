const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(
  root,
  'src-tauri',
  'target',
  'release',
  'cashier-de-yudira-tauri.exe'
);
const dist = path.join(root, 'dist');
const target = path.join(dist, 'Cashier de Yudira V2.0.5 (Tauri).exe');

if (!fs.existsSync(source)) {
  console.error('No se encontró el ejecutable compilado:', source);
  process.exit(1);
}

fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(source, target);
console.log('Exe portable:', target);
