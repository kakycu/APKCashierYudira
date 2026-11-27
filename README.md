# ChashierYudira (antes Visiones - CashFlow)

Calculadora de billetes multidenominación, 100 % local: no envía datos ni depende de la red para funcionar. Solo consulta GitHub para detectar versiones nuevas (en la APK, al abrir; en la web, al pulsar el botón).

Repositorio: https://github.com/kakycu/APKCashierYudira

El APK generado se llama **`ChashierYudira.apk`**. Las tarjetas del historial muestran el desglose de billetes con su equivalente (por ejemplo `7×10,000 = 70,000.00`, `1×500 = 500.00`); el mismo formato se usa en el detalle, el portapapeles y los tres informes exportados. En **Calculadora**, el espacio de **Filtrar denominaciones** está dividido en dos: a la izquierda se repite el card del **Total acumulado** (con el mismo estilo y valores sincronizados con el panel final) y a la derecha quedan el buscador (con una **X** interna para quitar el filtro, justo antes del botón **Vaciar**) y los botones **Vaciar**, **Copiar** y **Guardar**. En **Denominaciones** puedes activar/desactivar cada una, borrar las que hayas agregado y usar los accesos rápidos **Restablecer** y un interruptor deslizante **Activar todas / Desactivar todas** que cambia según el estado; las originales (`1, 3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000`) nunca muestran botón de borrar y no se pueden eliminar. La moneda se elige en un desplegable compacto (`CUP`, `USD`, `EUR`, `MXN` o **Personalizada…**) con el mismo estilo de los controles, en una sola fila para ahorrar espacio; al elegir **Personalizada…** se enfoca el campo del código y se aplica con el botón de check. **Denominaciones** y **Preferencias** son secciones independientes: la primera solo gestiona los billetes activos y la segunda reúne Tema, Confeti al guardar, Auto-guardado, Sonidos (UI) y **Orden ascendente** (de menor a mayor en la calculadora y en la lista de denominaciones).

Cada tarjeta de denominación en CUP lleva como marca de agua el billete cubano correspondiente, en color real y sin el sello «MUESTRA» (visible en tema claro y oscuro); bajo la línea discontinua, la cantidad y el equivalente van dentro de dos pills con fondo y texto que cambian según el tema. La lupa de la esquina superior derecha —o el título de la tarjeta— abre un visor ampliado con el billete completo, tarjeta de título con icono y el importe `$ 5000.00 CUP`. El importe en letras se muestra en ambos paneles de total, en Estadísticas, en las tarjetas y el detalle del historial, en el modal de guardado, en el portapapeles y en los tres informes exportados (Excel, Word y PDF). La fila **Repartir importe** —en una sola línea, entre la moneda y el filtro— distribuye un importe entre las denominaciones activas usando el **menor número de billetes**; los centavos se ignoran con aviso porque el reparto es solo en billetes, y si ya hay cantidades se pregunta si **Agregar** o **Reemplazar**.

## Pantalla de entrada

Al abrir la app (también en la APK) se muestra `www/intro.html` con esta coreografía: entra el círculo (`01_Circulo.png`) con la misma transición del original, después aparece el unicornio (`02_Unicornio.png`) más pequeño, luego `Yudira.png` cae desde arriba en grande y queda centrada dentro del círculo, sin recuadro ni borde (solo su recorte PNG con `drop-shadow`), y finalmente el unicornio sube por delante de la foto y se coloca encima del círculo. Al pasar el cursor sobre `Yudira.png`, la imagen se agranda suavemente (con un leve glow cian) y vuelve exactamente a su tamaño al retirarlo. Como Android no tiene eventos `hover`, al tocar `Yudira.png` se activa el mismo efecto durante un segundo y se lanzan 18 corazones rojos en distintos tamaños y opacidades, moviéndose como confeti desde el punto del toque con una caída lenta y bien visible (1.8 a 2.7 s); además, en pantallas táctiles se muestra dos veces de forma automática al terminar la animación para que se vea sin necesidad de tocar. Debajo aparece el botón **ENTRAR AL CASHIER DE YUDIRA**, que guarda un flag en `sessionStorage` y abre `index.html`. Bajo la versión se muestran el crédito `© Unicornio Software® - 2026` y la línea `En colaboración con MiPyMe "Visiones"`, con **Visiones** en negrita, el unicornio en blanco completo y sin glow; el unicornio animado sobre Yudira lleva un glow blanco/cian más visible y termina un poco más pequeño. El icono de la app es `cashier.png`. Todos los botones incluyen icono, incluidos los diálogos.

## Menú lateral y actualizaciones (V2.0.5)

- Botón de hamburguesa en la barra de título: abre una barra lateral con las cinco secciones (Calculadora, Historial, Denominaciones, Estadísticas y Preferencias), acciones rápidas (guardar, vaciar y **Exportar**), **Repetir animación de inicio**, **Autor**, **Cerrar aplicación** y **Buscar actualizaciones**. El control de **Sonidos** ya no está en el sidebar: queda únicamente en **Preferencias**. En la barra de título queda un **icono único de tema** (sol/luna) justo antes de la **X** de cerrar: pulsa para alternar entre claro y oscuro; en la APK, donde la X está oculta, el icono sigue visible. **Preferencias** mantiene su conmutador sincronizado, que sustituyó al antiguo slider. Se eliminaron Minimizar, Maximizar y el botón de **Exportar**.
- Dos botones flotantes con icono en el lado derecho inferior: **Ir al inicio** (`fa-arrow-up`) y **Ir al final** (`fa-arrow-down`). Funcionan tanto en la web como en la APK, respetan el scroll del documento y el contenedor `.app` en pantallas apaisadas, y se ocultan mientras el menú lateral está abierto.
- **Repetir animación de inicio** limpia la marca de sesión y vuelve a `intro.html`, de modo que la animación completa (círculo, Yudira y unicornio) se reproduce desde el principio; al pulsar **Entrar al Cashier de Yudira** se regresa a la app.
- **Autor** abre un modal con el perfil de Franklin Ramos Lamadrid (Kaky): título `Ingeniería y Desarrollo`, su foto local `www/images/franklin-ramos-lamadrid.jpg`, la biografía de `about.php` y botones con icono para Facebook y Cerrar. Al tocar la foto se abre un segundo modal con la imagen completa (`www/images/franklin-ramos-lamadrid-full.jpg`) para verla con más detalle; se cierra con Escape, con Cerrar o tocando fuera y vuelve al perfil del autor. Debajo del nombre aparece «Kaky® - kakycu@gmail.com» en una sola línea, como enlace `mailto:` con el asunto «Sobre el APK Cashier de Yudira V2.0.5» (se genera con `APP_VERSION`). El modal del autor se cierra con Escape, con el botón Cerrar o tocando fuera; el botón Atrás de Android cierra primero el visor de foto, luego el perfil.
- El cierre usa `App.exitApp()` en Android y una confirmación + recarga en navegador; el botón Atrás cierra primero el menú.
- En la **APK**, al abrir la app (después de la intro) se comprueba en silencio el último *release* de GitHub; si hay una versión nueva se muestra el diálogo con el enlace directo al APK. Si no hay conexión, no se muestra ningún aviso y la app sigue funcionando sin red.
- En la **web**, la búsqueda sigue siendo manual: solo consulta GitHub al pulsar el botón. Si no hay conexión, avisa y la app sigue funcionando. En ambos casos el diálogo lleva el enlace al APK; en Android se abre con `window.open(url, '_system')`.
- Versiones: `APP_VERSION` en `www/app.js`, la versión del titlebar/intro y `versionName` de Android deben coincidir con el tag de la release (`v2.0.5`, `versionCode 5`); la etiqueta visible es `V2.0.5`. Para probar la detección, instala primero `v2.0.3` y abre la app: debe aparecer el diálogo con el enlace a `v2.0.5`. Los sonidos vienen activados por defecto.
- El tema nace siempre en **oscuro** si no hay preferencia guardada, pero se puede cambiar a claro desde el icono sol/luna de la barra de título o desde **Preferencias → Tema oscuro / Tema claro**, con el mismo conmutador visual (luna/sol); el icono de la titlebar muestra el tema al que se cambiará y el texto de la fila de Preferencias cambia con el tema. La elección se guarda en `localStorage`/`Preferences` y se aplica también a la barra de estado de Android. Todos los botones —acciones, pestañas, sidebar, cantidades, ventana, iconos y chips— usan paletas de color distintas en claro y en oscuro (fondo, borde, texto y degradado principal cambian con el tema).
- Hay un **único modal Exportar**, centrado en la app (botón en **Historial** y opción en el menú lateral), con tres formatos: **a Excel** (`.xlsx`), **a Word** (`.docx`) y **a PDF** (`.pdf`). Se cierra con la **X**, tocando fuera o con Escape/Atrás. Si no hay registros (o el registro seleccionado ya no existe), aparece un modal de aviso y no se genera ningún archivo. Todos exportan el historial completo (fecha, nota, moneda, total, cantidad de billetes y desglose). El Excel incluye cabecera corporativa, tarjetas de resumen, tabla con filtros y total, hoja **Resumen**, pie con `© Unicornio Software® - 2026`, número de página y fecha de generación. El Word se genera como OOXML mínimo con JSZip local (tabla, encabezado y pie con número de página) para máxima compatibilidad; el PDF mantiene la misma identidad visual. En la web descargan con un `Blob`; en la APK se escriben en la caché y se comparten con Android. Las librerías están en `www/vendor/` (ExcelJS, JSZip y jsPDF), sin CDN ni peticiones de red.
- En **Calculadora**, junto a **Vaciar** y **Guardar** hay un botón **Copiar** con icono: abre el mismo modal de nota y copia el cálculo actual con el formato descrito abajo, sin necesidad de guardarlo primero.
- Al guardar aparece un modal grande y centrado: **¡REGISTRO GUARDADO!**, el importe y una explosión de confeti con resplandor que nace del centro del área visible de la app (se adapta al desplazamiento y al alto de la pantalla), dura de 2.2 a 3.2 s y se ve sobre el modal. El modal solo se cierra con su botón **CERRAR** (con icono); no se cierra solo, ni con clic fuera, ni con Escape/Atrás.
- Cada tarjeta del historial tiene su botón **Exportar** (icono): abre el modal centrado con el título `Exportar registro #N` y genera Excel, Word o PDF solo de esa tarjeta. Al tocar la tarjeta se abre además un modal con el mismo contenido (total, moneda, billetes, fecha, nota y desglose) y botones para **copiar**, **restaurar** y **exportar ese registro**. El botón **Copiar** genera un bloque con `Copiado de:`, nombre de la APK, versión, fecha en 12 horas, nota, total, cantidad de billetes y el desglose completo, donde cada denominación incluye su equivalente (`3×60,000 = 180,000.00`).
- Todas las fechas visibles usan formato 12 horas con día, mes y año, por ejemplo `26-11-2026 06:53 p.m.` (también en los informes exportados y en el portapapeles).

## Control de cambios

### V2.0.5 (`versionCode 5`)
- Última versión: se mantiene la firma estable y todas las funciones anteriores.
- **Denominaciones** y **Preferencias** están separadas: la pestaña «Denomin.» solo administra los billetes activos y la pestaña «Prefcias.» —ahora después de «Estadísticas»— reúne Tema (con el conmutador de la barra de título), Confeti al guardar, Auto-guardado, Sonidos (UI) y Orden ascendente.
- `$1.00 CUP` es una denominación fija del programa: se añade automáticamente incluso a estados guardados en versiones anteriores y no se puede borrar.
- En **Denominaciones activas** hay dos acciones rápidas: **Restablecer** (vuelve a las 14 originales y elimina las personalizadas) y un interruptor deslizante que alterna entre **Activar todas** (incluye las personalizadas desactivadas) y **Desactivar todas** (deja la calculadora en cero sin tocar el historial). El interruptor muestra la acción siguiente según el estado, con pista verde cuando todas están activas, icono y `aria-checked` sincronizados; Restablecer y desactivar todas piden confirmación, y ambas acciones respetan el orden elegido en Preferencias.
- **Repartir importe**: escribe un importe y pulsa **Distribuir** (o Enter). El botón conserva su texto y cambia de color con el tema: **amarillo** en oscuro (con texto oscuro) y **verde** en claro. Si el campo está vacío, es cero, negativo o no llega a 1, aparece un modal con **Importe requerido** y un botón **Entendido** en lugar del aviso temporal. Se reparte con el menor número de billetes posible (programación dinámica; para importes muy grandes, reparto rápido) usando solo denominaciones activas. Los centavos se ignoran y se avisa. Si ya hay billetes contados, un modal ofrece **Agregar**, **Reemplazar** o **Cancelar**; se cierra con Escape o Atrás. En móvil, la fila se mantiene en una sola línea con el código de moneda y la etiqueta visibles.
- Las imágenes de los 14 billetes cubanos (`www/billetes/_alt-<denominación>.jpg`) se usan como marca de agua en color de cada tarjeta y en un visor ampliado que se abre con la lupa situada antes de la **X** (o tocando el título). El visor tiene una tarjeta de título con icono FontAwesome (`fa-money-bill-wave`) y el importe `$ 5000.00 CUP`, un escenario amplio con sombra y se cierra con Escape, Cerrar, clic fuera o Atrás en Android. Los JPG están normalizados a 800 × 376 px (mismo ancho y alto en los 14, recorte central sin deformar) y comprimidos de forma progresiva (calidad 78), conservando los nombres, para reducir el tamaño del APK.
- **Preferencias → Orden ascendente** invierte el orden de las denominaciones en la calculadora, en la lista de denominaciones activas y en Estadísticas; el valor se guarda y se restaura al reiniciar.
- El importe en letras (por ejemplo `CIENTO CINCUENTA Y TRES MIL PESOS CUBANOS CON 00/100 CENTAVOS`, con soporte hasta billones: `UN BILLÓN PESOS CUBANOS CON 00/100 CENTAVOS`) aparece en la calculadora, el historial, el detalle, Estadísticas, el modal de guardado, el portapapeles y los informes Excel, Word y PDF.
- La línea discontinua bajo el selector de cantidad y el contorno del selector se han reforzado en tema claro para que se distingan con nitidez.
- El menú lateral muestra **Preferencias** como última sección, después de **Estadísticas**, con su texto completo (las formas cortas «Denomin.» y «Prefsias.» solo aparecen en las pestañas) y ya no duplica el acceso dentro de Acciones.
- El confeti al guardar nace del centro del área visible de la app (no del contenedor completo, que puede ser más alto que la pantalla), es más lento (2.2 a 3.2 s, antes 1.0 a 1.5 s) y se muestra por encima del modal, en lugar de salir desde el botón **Guardar**.
- El tema se cambia desde **Preferencias** con el conmutador de la barra de título (luna/sol), que sustituye al antiguo slider; el icono y el texto de la fila son conmutables y el valor implícito sigue siendo oscuro.
- Al elegir una sección desde el sidebar, las pestañas se desplazan a la izquierda hasta que la activa queda visible, incluso en pantallas estrechas.
- El botón de **Exportar** ya no está en la barra de título: sigue disponible en **Historial** y en el menú lateral.
- Los tooltips son propios (tarjeta con punto de acento, flecha y animación suave), no el `title` nativo: aparecen con ratón, teclado y toque, y se adaptan a tema claro/oscuro.
- El buscador de **Filtrar denominaciones** es compacto: el campo es un poco más amplio, los tres botones caben en la misma línea y los cuatro elementos se reparten con `flex` según su tamaño; el campo admite un número de 6 dígitos sin recortarse.
- Versión alineada en `APP_VERSION`, título de la web y del sidebar, intro, etiqueta lateral y `versionName` (`V2.0.5`). Sin etiquetas adicionales en los textos visibles.

### v2.0.3 (`versionCode 4`)
- APK firmada con keystore estable en GitHub Secrets: se actualiza instalando encima, sin desinstalar la versión anterior (salvo el primer cambio de firma).
- Versión alineada en `APP_VERSION`, título, intro y `versionName` (`v2.0.3`).
- Se mantiene todo lo de v2.0.2: exportación individual, aviso sin datos, Word OOXML, copia detallada, modal de guardado persistente, Sonidos solo en Preferencias, intro táctil con corazones y **Visiones** en negrita.

### v2.0.2 (`versionCode 3`)
- Exportación individual por tarjeta, aviso cuando no hay registros, Word OOXML local, copia con desglose, botón Copiar en calculadora, modal de guardado persistente, desglose con equivalentes y sonidos retirados del sidebar.

## Compilar desde GitHub

El workflow `.github/workflows/build-apk.yml` compila automáticamente en cada `push` a `main` y genera una APK **release firmada** (`assembleRelease`) con un keystore estable guardado en GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Eso permite actualizar instalando encima sin desinstalar. También puedes lanzarlo manualmente: pestaña **Actions** → *Compilar APK ChashierYudira* → **Run workflow**. El APK queda como artefacto descargable (`ChashierYudira`) **y se publica automáticamente en un release de GitHub** con el tag `v<versionName>` (por ejemplo `v2.0.5`). Si el release ya existe se reemplaza el APK y se actualiza el título; si no, se crea con notas automáticas. Al cambiar de la firma debug anterior a esta firma estable hay que desinstalar una sola vez; las actualizaciones posteriores ya no.

## Estructura

- `index.html` (raíz): redirección a `www/intro.html` para abrir con doble clic.
- `www/`: **código fuente de la aplicación**.
  - `intro.html` (animación de entrada), `index.html` (app), `styles.css`, `app.js`
  - `anim/` (solo `01_Circulo.png`, `02_Unicornio.png` y `Yudira.png`, usados en la animación)
  - `billetes/` (14 JPG locales de los billetes cubanos, sin sello «MUESTRA», para marcas de agua y visor)
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

Modo avión, botón Atrás, notch/pantalla corta, rotación, copiar al portapapeles, sonido tras el primer toque y persistencia del historial tras actualizar la APK. Si después de cambiar `www/` no ves los cambios en el navegador, recarga con **Ctrl+F5**: `styles.css` y `app.js` se referencian con `?v=2.0.5` para renovar la caché. En la APK, los cambios de `www/` solo se reflejan tras `npx cap sync` y recompilar.
