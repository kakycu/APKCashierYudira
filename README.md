# ChashierYudira (antes Visiones - CashFlow)

Calculadora de billetes multidenominación, 100 % local: no envía datos ni depende de la red para funcionar. Solo consulta GitHub para detectar versiones nuevas (en la APK, al abrir; en la web, al pulsar el botón).

Repositorio: https://github.com/kakycu/APKCashierYudira

El APK generado se llama **`ChashierYudira.apk`**. Las tarjetas del historial muestran el desglose de billetes con su equivalente (por ejemplo `7×10,000 = 70,000.00`, `1×500 = 500.00`); el mismo formato se usa en el detalle, el portapapeles y los tres informes exportados. En **Calculadora**, el espacio de **Filtrar denominaciones** está dividido en dos: a la izquierda se repite el card del **Total acumulado** (con el mismo estilo y valores sincronizados con el panel final) y a la derecha quedan el buscador (con una **X** interna para quitar el filtro, justo antes del botón **Vaciar**) y los botones **Vaciar** y **Guardar**. En **Denominaciones** puedes activar/desactivar cada una y borrar las que hayas agregado; las originales (`3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000`) nunca muestran botón de borrar y no se pueden eliminar. La moneda se elige en un desplegable compacto (`CUP`, `USD`, `EUR`, `MXN` o **Personalizada…**) con el mismo estilo de los controles, en una sola fila para ahorrar espacio; al elegir **Personalizada…** se enfoca el campo del código y se aplica con el botón de check.

## Pantalla de entrada

Al abrir la app (también en la APK) se muestra `www/intro.html` con esta coreografía: entra el círculo (`01_Circulo.png`) con la misma transición del original, después aparece el unicornio (`02_Unicornio.png`) más pequeño, luego `Yudira.png` cae desde arriba en grande y queda centrada dentro del círculo, sin recuadro ni borde (solo su recorte PNG con `drop-shadow`), y finalmente el unicornio sube por delante de la foto y se coloca encima del círculo. Al pasar el cursor sobre `Yudira.png`, la imagen se agranda suavemente (con un leve glow cian) y vuelve exactamente a su tamaño al retirarlo. Como Android no tiene eventos `hover`, al tocar `Yudira.png` se activa el mismo efecto durante un segundo y se lanzan 18 corazones rojos en distintos tamaños y opacidades, moviéndose como confeti desde el punto del toque con una caída lenta y bien visible (1.8 a 2.7 s); además, en pantallas táctiles se muestra dos veces de forma automática al terminar la animación para que se vea sin necesidad de tocar. Debajo aparece el botón **ENTRAR AL CASHIER DE YUDIRA**, que guarda un flag en `sessionStorage` y abre `index.html`. Bajo la versión se muestran el crédito `© Unicornio Software® - 2026` y la línea `En colaboración con MiPyMe "Visiones"`, con **Visiones** en negrita, el unicornio en blanco completo y sin glow; el unicornio animado sobre Yudira lleva un glow blanco/cian más visible y termina un poco más pequeño. El icono de la app es `cashier.png`. Todos los botones incluyen icono, incluidos los diálogos.

## Menú lateral y actualizaciones (v2.0.3)

- Botón de hamburguesa en la barra de título: abre una barra lateral con las cuatro secciones, acciones rápidas (guardar, vaciar, **Exportar**, preferencias), **Repetir animación de inicio**, **Autor**, **Cerrar aplicación** y **Buscar actualizaciones**. El control de **Sonidos** ya no está en el sidebar: queda únicamente en **Preferencias**. En la barra de título solo quedan el icono de **Exportar** y la **X** de cerrar; se eliminaron Minimizar y Maximizar.
- Dos botones flotantes con icono en el lado derecho inferior: **Ir al inicio** (`fa-arrow-up`) y **Ir al final** (`fa-arrow-down`). Funcionan tanto en la web como en la APK, respetan el scroll del documento y el contenedor `.app` en pantallas apaisadas, y se ocultan mientras el menú lateral está abierto.
- **Repetir animación de inicio** limpia la marca de sesión y vuelve a `intro.html`, de modo que la animación completa (círculo, Yudira y unicornio) se reproduce desde el principio; al pulsar **Entrar al Cashier de Yudira** se regresa a la app.
- **Autor** abre un modal con el perfil de Franklin Ramos Lamadrid (Kaky): título `Fundador · Ingeniería y Desarrollo`, su foto local `www/images/franklin-ramos-lamadrid.jpg`, la biografía de `about.php` y botones con icono para Facebook y Cerrar. Al tocar la foto se abre un segundo modal con la imagen completa (`www/images/franklin-ramos-lamadrid-full.jpg`) para verla con más detalle; se cierra con Escape, con Cerrar o tocando fuera y vuelve al perfil del autor. El modal del autor se cierra con Escape, con el botón Cerrar o tocando fuera; el botón Atrás de Android cierra primero el visor de foto, luego el perfil.
- El cierre usa `App.exitApp()` en Android y una confirmación + recarga en navegador; el botón Atrás cierra primero el menú.
- En la **APK**, al abrir la app (después de la intro) se comprueba en silencio el último *release* de GitHub; si hay una versión nueva se muestra el diálogo con el enlace directo al APK. Si no hay conexión, no se muestra ningún aviso y la app sigue funcionando sin red.
- En la **web**, la búsqueda sigue siendo manual: solo consulta GitHub al pulsar el botón. Si no hay conexión, avisa y la app sigue funcionando. En ambos casos el diálogo lleva el enlace al APK; en Android se abre con `window.open(url, '_system')`.
- Versiones: `APP_VERSION` en `www/app.js`, la versión del titlebar/intro y `versionName` de Android deben coincidir con el tag de la release (`v2.0.3`, `versionCode 4`). Para probar la detección, instala primero `v2.0.2` y abre la app: debe aparecer el diálogo con el enlace a `v2.0.3`. Los sonidos vienen activados por defecto.
- El tema es **oscuro fijo**: no hay interruptor y cualquier valor claro guardado en `localStorage`/`Preferences` se sobrescribe a `dark` al iniciar. La barra de estado de Android usa iconos claros sobre fondo `#0a0c10`.
- Hay un **único modal Exportar**, centrado en la app (icono en la barra de título, botón en **Historial** y opción en el menú lateral), con tres formatos: **a Excel** (`.xlsx`), **a Word** (`.docx`) y **a PDF** (`.pdf`). Se cierra con la **X**, tocando fuera o con Escape/Atrás. Si no hay registros (o el registro seleccionado ya no existe), aparece un modal de aviso y no se genera ningún archivo. Todos exportan el historial completo (fecha, nota, moneda, total, cantidad de billetes y desglose). El Excel incluye cabecera corporativa, tarjetas de resumen, tabla con filtros y total, hoja **Resumen**, pie con `© Unicornio Software® - 2026`, número de página y fecha de generación. El Word se genera como OOXML mínimo con JSZip local (tabla, encabezado y pie con número de página) para máxima compatibilidad; el PDF mantiene la misma identidad visual. En la web descargan con un `Blob`; en la APK se escriben en la caché y se comparten con Android. Las librerías están en `www/vendor/` (ExcelJS, JSZip y jsPDF), sin CDN ni peticiones de red.
- En **Calculadora**, junto a **Vaciar** y **Guardar** hay un botón **Copiar** con icono: abre el mismo modal de nota y copia el cálculo actual con el formato descrito abajo, sin necesidad de guardarlo primero.
- Al guardar aparece un modal grande y centrado: **¡REGISTRO GUARDADO!**, el importe y una explosión de confeti con resplandor desde el botón **Guardar**. El modal solo se cierra con su botón **CERRAR** (con icono); no se cierra solo, ni con clic fuera, ni con Escape/Atrás.
- Cada tarjeta del historial tiene su botón **Exportar** (icono): abre el modal centrado con el título `Exportar registro #N` y genera Excel, Word o PDF solo de esa tarjeta. Al tocar la tarjeta se abre además un modal con el mismo contenido (total, moneda, billetes, fecha, nota y desglose) y botones para **copiar**, **restaurar** y **exportar ese registro**. El botón **Copiar** genera un bloque con `Copiado de:`, nombre de la APK, versión, fecha en 12 horas, nota, total, cantidad de billetes y el desglose completo, donde cada denominación incluye su equivalente (`3×60,000 = 180,000.00`).
- Todas las fechas visibles usan formato 12 horas con día, mes y año, por ejemplo `26-11-2026 06:53 p.m.` (también en los informes exportados y en el portapapeles).

## Control de cambios

### v2.0.3 (`versionCode 4`)
- APK firmada con keystore estable en GitHub Secrets: se actualiza instalando encima, sin desinstalar la versión anterior (salvo el primer cambio de firma).
- Versión alineada en `APP_VERSION`, título, intro y `versionName` (`v2.0.3`).
- Se mantiene todo lo de v2.0.2: exportación individual, aviso sin datos, Word OOXML, copia detallada, modal de guardado persistente, Sonidos solo en Preferencias, intro táctil con corazones y **Visiones** en negrita.

### v2.0.2 (`versionCode 3`)
- Exportación individual por tarjeta, aviso cuando no hay registros, Word OOXML local, copia con desglose, botón Copiar en calculadora, modal de guardado persistente, desglose con equivalentes y sonidos retirados del sidebar.

## Compilar desde GitHub

El workflow `.github/workflows/build-apk.yml` compila automáticamente en cada `push` a `main` y genera una APK **release firmada** (`assembleRelease`) con un keystore estable guardado en GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Eso permite actualizar instalando encima sin desinstalar. También puedes lanzarlo manualmente: pestaña **Actions** → *Compilar APK ChashierYudira* → **Run workflow**. El APK queda como artefacto descargable (`ChashierYudira`). Al cambiar de la firma debug anterior a esta firma estable hay que desinstalar una sola vez; las actualizaciones posteriores ya no.

## Estructura

- `index.html` (raíz): redirección a `www/intro.html` para abrir con doble clic.
- `www/`: **código fuente de la aplicación**.
  - `intro.html` (animación de entrada), `index.html` (app), `styles.css`, `app.js`
  - `anim/` (solo `01_Circulo.png`, `02_Unicornio.png` y `Yudira.png`, usados en la animación)
  - `fonts/` (Inter + JetBrains Mono, `.woff2` con licencias OFL)
  - `vendor/fontawesome/` (iconos locales)
  - `icons/` (`cashier.png` original e iconos 192/512 y maskable generados desde él)
  - `vendor/exceljs/`, `vendor/jszip/` y `vendor/jspdf/` (exportación local con sus licencias)
  - `manifest.webmanifest`
  - `sounds/` (vacío; los sonidos se generan con Web Audio)

> Los archivos `fonts/`, `vendor/`, `sounds/` y `visioneslogo.png` en la raíz son copias de los originales; la app ya no los usa. Puedes eliminarlos cuando quieras.

## Adaptación móvil / APK (fase 1 aplicada)

`app.js` detecta Capacitor mediante `window.Capacitor` sin importar paquetes, así que **la versión web sigue funcionando igual** si los plugins no están instalados:

- `body.native` oculta los botones de ventana y ajusta `safe-area` / `touch-action`.
- `Preferences` se usa como copia persistente de `localStorage` y se restaura al arrancar.
- `Clipboard` nativo con fallback a `navigator.clipboard` y `execCommand`.
- `App.addListener('backButton', …)`: vuelve a la pestaña Calculadora o pide confirmación para salir.
- `StatusBar` sigue el tema claro/oscuro.
- El `prompt()` de la nota fue sustituido por un modal propio.
- Un único `AudioContext` se reutiliza y se reanuda en el primer toque.

Cuando los plugins no están presentes, todo usa las alternativas web automáticamente.

## Preparar el APK (fase 2, cuando quieras)

```bash
npm init -y
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/android @capacitor/app @capacitor/clipboard @capacitor/preferences @capacitor/status-bar
npx cap init VisionesCashFlow com.visiones.cashflow --web-dir=www
npx cap add android
npx cap sync
```

`capacitor.config.json` debe conservar `webDir: "www"` y `androidScheme: "https"`. Después abre `android/` en Android Studio y genera un APK firmado (*Build → Generate Signed Bundle / APK*). `minSdkVersion 24`, `targetSdkVersion 36`. El icono se genera desde `cashier.png` en `www/icons/` y en `android/app/src/main/res/mipmap-*/`.

Cada vez que cambies `www/`: `npx cap sync` y recompilar. La compilación usa los repositorios oficiales de Google y Maven Central; si estás en una red donde Google Maven no es accesible, añade `-PuseMirrors` a `./gradlew assembleRelease` para activar los espejos.

## Pruebas recomendadas

Modo avión, botón Atrás, notch/pantalla corta, rotación, copiar al portapapeles, sonido tras el primer toque y persistencia del historial tras actualizar la APK.
