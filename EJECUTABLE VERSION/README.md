# EJECUTABLE VERSION

Dos formas de ejecutar **Cashier de Yudira V2.0.5** en Windows. Ambas parten de la misma `www/` de la raíz del repo; no se publica nada en GitHub.

| Carpeta | Tecnología | Resultado |
|---|---|---|
| `ELECTRON/` | Electron + electron-builder | Instalador NSIS con `app.asar`, sin extracción temporal |
| `TAURI/` | Tauri + WebView2 | Un único `.exe` portable, sin instalador |

Entra en la carpeta que quieras y ejecuta:

```powershell
npm install
npm run build
```

En `TAURI/` también puedes usar `npm run build:portable`; genera `dist/Cashier de Yudira V2.0.5 (Tauri).exe`.

Cada proyecto sincroniza su copia de `www/` antes de compilar. Los ejecutables generados en `dist/` no se suben a GitHub.
