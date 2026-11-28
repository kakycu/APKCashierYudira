# Cashier de Yudira — TAURI

Versión de escritorio basada en **Tauri 2**. Usa el WebView2 que ya trae Windows, por lo que no empaqueta Chromium. Es un proyecto independiente de `ELECTRON/`.

## Resultado portable

La compilación genera un **único ejecutable**, sin instalador:

```text
EJECUTABLE VERSION/TAURI/dist/Cashier de Yudira V2.0.5 (Tauri).exe
```

Ese `.exe` se puede copiar a otra PC con Windows y ejecutar directamente. No necesita MSYS2, Rust ni Node.js en la PC destino; solo WebView2 Runtime, que ya viene instalado en Windows 10/11. El cargador `WebView2Loader` queda enlazado dentro del ejecutable.

## Requisitos para compilar en esta PC

- Node.js y npm.
- Rust (rustup), ya instalado en `%USERPROFILE%\.cargo\bin`.
- Visual Studio Build Tools con `VCTools` y Windows 11 SDK `10.0.26100`.
- WebView2 Runtime (ya presente).

## Compilar

Dentro de `EJECUTABLE VERSION/TAURI`, con el entorno de Visual Studio cargado:

```powershell
$vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'
$entorno = cmd /c "`"$vcvars`" >nul 2>&1 && set"
foreach($linea in $entorno){
  if($linea -match '^([^=]+)=(.*)$'){
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:RUSTUP_TOOLCHAIN = 'stable-x86_64-pc-windows-msvc'
npm install
npm run build:portable
```

El script sincroniza la `www/` de la raíz del repo, compila con MSVC y copia el ejecutable a `dist/` con el nombre visible `Cashier de Yudira V2.0.5 (Tauri).exe`.

## Notas

- La ventana se llama `Cashier de Yudira V2.0.5 (Tauri)` para distinguirla de Electron.
- El contenido web va incrustado en el `.exe`; no hay CDN ni carpetas externas.
- Los enlaces `mailto:` y de GitHub se abren con la aplicación predeterminada del sistema mediante `tauri-plugin-opener`.
