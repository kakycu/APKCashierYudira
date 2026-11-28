# Cashier de Yudira — ELECTRON

Versión de escritorio basada en **Electron**. La web se empaqueta dentro de `resources/app.asar`, así que en la instalación no aparece una carpeta `www` con los archivos.

## Compilar

Dentro de `EJECUTABLE VERSION/ELECTRON`:

```powershell
npm install
npm run build
```

`npm run build` sincroniza la `www/` de la raíz del repo dentro de esta carpeta y genera en `dist/`:

- `CashierDeYudira-2.0.5-x64.exe` — instalador NSIS, usado en esta PC.
- `CashierDeYudira-2.0.5-portable-x64.exe` — portable alternativo (extrae en `%TEMP%`).

## Instalar en esta PC

```powershell
.\dist\CashierDeYudira-2.0.5-x64.exe /S
```

Queda en:

```text
%LOCALAPPDATA%\Programs\Cashier de Yudira
```

Con accesos directos en Escritorio y Menú Inicio. Incluye las DLLs de Electron y `resources\app.asar`. **No hay extracción temporal**: los procesos se ejecutan directamente desde esa carpeta.

## Notas

- Requiere Windows 10/11 de 64 bits.
- El primer arranque muestra la intro, igual que en la APK.
- Los datos se guardan en `localStorage` dentro del perfil de Electron.
- Los enlaces externos se abren en el navegador del sistema.
- `app.asar` oculta los archivos al Explorador de Windows; no es cifrado, pero evita que se vean o se extraigan con un clic.
- El ejecutable puede mostrar el aviso de SmartScreen al no estar firmado con certificado comercial.
