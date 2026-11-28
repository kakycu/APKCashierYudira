const fs = require('fs');
const path = require('path');

/* La APK y el escritorio comparten la misma web. Copiamos la www del repo
   (dos niveles arriba de ELECTRON) para que electron-builder la meta en app.asar. */
const source = path.join(__dirname, '..', '..', '..', 'www');
const dest = path.join(__dirname, '..', 'www');

if(!fs.existsSync(source)){
  throw new Error(`No existe la carpeta web fuente: ${source}`);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(source, dest, { recursive: true, force: true });

console.log(`www sincronizado: ${dest}`);
