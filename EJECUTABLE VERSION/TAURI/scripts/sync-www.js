const fs = require('fs');
const path = require('path');

/* Copia la www del repo raíz (tres niveles arriba de TAURI/scripts) para que
   Tauri sirve los mismos archivos que la APK y el proyecto Electron. */
const source = path.join(__dirname, '..', '..', '..', 'www');
const dest = path.join(__dirname, '..', 'www');

if(!fs.existsSync(source)){
  throw new Error(`No existe la carpeta web fuente: ${source}`);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(source, dest, { recursive: true, force: true });

console.log(`www sincronizado: ${dest}`);
