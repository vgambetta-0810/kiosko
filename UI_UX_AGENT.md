# UI/UX Design Agent

Documento obligatorio para revisar, disenar y refactorizar cualquier cambio de interfaz del proyecto Kiosko Escolar.

Este agente existe para mantener una identidad visual coherente, moderna y profesional en toda la aplicacion. Antes de aprobar o implementar cambios de frontend, debe verificar este documento contra las paginas, componentes y estilos existentes.

## 1. Alcance del Agente

El Agente UI/UX revisa exclusivamente experiencia de usuario, consistencia visual, accesibilidad y reutilizacion de componentes frontend.

Debe responder siempre:

- Este componente respeta la identidad visual?
- Los colores, radios, sombras, tipografia y espaciados son consistentes?
- La experiencia coincide con el resto de la aplicacion?
- Existe ya un componente o patron que haga esto?
- La pantalla respeta el Design System?
- El flujo es claro para ADMIN, SELLER, CLIENT o PARENT?
- Hay estados de carga, error, vacio y exito?
- Es accesible por teclado y lector de pantalla?

No debe decidir reglas de negocio, modelos de datos, endpoints ni arquitectura backend.

## 2. Auditoria UI Actual

### Estructura Revisada

- App y navegacion: `frontend/src/App.jsx`.
- Estilos globales: `frontend/src/styles/main.css`.
- Configuracion visual: `frontend/tailwind.config.js`.
- Paginas: `LoginPage`, `RegisterPage`, `AdminDashboard`, `AnalyticsDashboard`, `StockDashboard`, `SellerPOS`, `ClientPanel`, `HomePage`.
- Componentes POS: `SKUInput`, `SalesTable`, `QuantityModal`, `CheckoutStep`.
- Componentes inventario: `InventoryToolbar`, `InventoryTable`, `InventoryRowActions`, `InventoryPagination`, `InventoryMetrics`, `ProductDrawer`, `ProductForm`, `StockBadge`.
- Componentes analytics: `FilterBar`, `KpiCard`, `Charts`, `FinancePanels`.
- Componentes generales: `MovementHistory`, `ManualAdjustment`.

### Identidad Visual Actual

La aplicacion tiene una base visual fuerte en `main.css`: azul tinta, bordo, superficies claras, bordes suaves, Manrope/Segoe UI, cards con sombra y radios amplios. Esa identidad se ve sobre todo en Login, POS e Inventario.

Tambien existe un segundo lenguaje visual en Analytics: tema oscuro Tailwind con slate/cyan, `panel`, `panelSoft`, `panelBorder`, `accent`, radios `rounded-2xl` y sombras `shadow-glow`.

Admin, Client, Register, Home y ManualAdjustment estan menos terminadas: usan `.page` y `.card`, pero no tienen variantes formales para formularios, botones, listas ni feedback.

### Inconsistencias Visuales

- Analytics usa un tema oscuro independiente con Tailwind directo, mientras POS e Inventario usan variables CSS claras/oscuras de `main.css`.
- Hay dos sistemas de color: CSS variables (`--primary`, `--secondary`, `--success`, `--danger`) y Tailwind extendido (`ink`, `panel`, `accent`) sin mapeo formal entre ambos.
- Las cards alternan entre `.card`, `inventory-metric`, `pos-total-card`, `rounded-2xl bg-panelSoft`, `bg-slate-900/60` y contenedores sin clase comun.
- Los botones primarios se repiten como `auth-button`, `inventory-primary-action`, botones POS con gradiente, y `bg-cyan-500` en Analytics.
- Los botones secundarios no tienen una variante oficial unica: aparecen como botones de tabla, paginacion, drawer close, modal cancel y links.
- Los inputs tienen estilos por dominio (`auth-field`, `pos-*`, `inventory-*`, Tailwind analytics) y Register/Admin usan inputs nativos sin estilo dedicado.
- Los estados de error/exito existen en Auth, POS e Inventario, pero no comparten componente ni semantica visual uniforme.
- Los radios son variables de 10/12/18 px en CSS, 13/24 px en Auth y `rounded-xl`/`rounded-2xl` en Analytics.
- Los textos mezclan espanol e ingles: `Seller POS`, `Loading session...`, `Saving...`, `No client`, `Paid`, `Pending`, `Admin Dashboard`, `Products`.
- Hay textos con problemas de codificacion visibles, por ejemplo `gestiÃ³n`, `contraseÃ±a`, `IngresÃ¡`, `bÃºsqueda`.
- Algunos iconos lucide se usan en Analytics, pero la navegacion, acciones de filas y botones de cierre usan texto o `X`.
- La navegacion superior usa texto simple; no hay patron de layout lateral o breadcrumb para pantallas densas.

### Componentes Duplicados o Repetidos

- Boton primario: Auth, Inventario, POS y Analytics implementan variantes separadas.
- Campo de formulario: Auth, Inventario, POS, Register y Analytics repiten input/select con estilos distintos.
- Card/panel: `.card`, metric cards, KPI cards, chart panels, finance panels y POS summary cards cumplen el mismo rol visual.
- Tabla: POS e Inventario tienen tablas propias; comparten necesidades de header, empty state, scroll horizontal y acciones.
- Badge: `StockBadge` existe solo para stock; Analytics usa texto coloreado para estados financieros.
- Alertas: `auth-error`, `inventory-error`, `inventory-success`, `pos-message`, `pos-error`, y mensajes Tailwind en Analytics.
- Modales/drawers: `QuantityModal` y `ProductDrawer` comparten overlay/dialog, pero no una base comun.
- Empty states: tablas de POS, Inventario, Reservas, Movimientos y Rankings tienen mensajes distintos y sin patron visual comun.

### Problemas UX

- AdminDashboard y ClientPanel parecen prototipos: listas simples sin jerarquia visual, acciones, estados vacios ni resumen.
- RegisterPage no usa el mismo shell visual que LoginPage, aunque pertenece al mismo flujo de autenticacion.
- Analytics no hereda la navegacion visual del resto porque ocupa un `main` oscuro propio bajo el nav claro.
- ManualAdjustment usa `alert()`, que interrumpe la experiencia y rompe el sistema de feedback.
- Algunas acciones destructivas o sensibles no diferencian severidad: eliminar item POS usa un boton rojo con `X`, pero otras acciones no tienen confirmacion ni iconografia.
- El POS esta bien orientado a rapidez, pero mezcla etiquetas en ingles y espanol durante checkout.
- Las tablas dependen de scroll horizontal; es correcto para densidad, pero no hay patron documentado para version mobile ni columnas prioritarias.
- Los estados de carga son texto plano en varios lugares, no skeletons ni spinners consistentes.

### Problemas de Accesibilidad

- Falta `role="alert"` en varios errores/mensajes fuera de Auth.
- Botones iconicos con `X` deberian usar icono y `aria-label`; algunos lo tienen parcialmente, otros no.
- Overlays con `role="presentation"` no cierran al click fuera ni documentan manejo de foco/trap.
- Analytics usa contrastes en slate/cyan generalmente buenos, pero varios textos `text-slate-400` sobre `bg-slate-900/50` deben validarse.
- Hay inputs sin labels visibles o asociados en Register, Admin y algunos filtros simples.
- Sort buttons muestran flechas con caracteres rotos; deben tener indicador accesible (`aria-sort` o texto oculto).
- No hay regla uniforme de `focus-visible` para todos los controles, especialmente en Tailwind Analytics y botones nativos.

## 3. Design System Oficial

### Principios Visuales

- La aplicacion es una herramienta operativa escolar/comercial: debe sentirse clara, confiable, rapida y ordenada.
- Priorizar densidad legible sobre decoracion.
- Usar un solo lenguaje visual para dashboards, POS, inventario, auth y paneles.
- Las pantallas de trabajo deben usar fondos tranquilos, superficies blancas o paneles oscuros solo si el modo oscuro esta aplicado de forma global.
- Evitar crear estilos por pantalla cuando exista un patron comun.

### Tokens de Color

Usar estos tokens como fuente de verdad conceptual. Los valores actuales pueden vivir como CSS variables en `main.css` y mapearse en Tailwind.

| Token | Uso | Valor actual recomendado |
| --- | --- | --- |
| `primary` | Navegacion, foco, acciones principales | `#0b1f3a` |
| `primary-dark` | Hover/activo oscuro | `#071327` |
| `primary-light` | Focus ring, bordes activos | `#16345d` |
| `secondary` | Acento institucional, kicker, gradiente | `#6d1023` |
| `secondary-light` | Hover de links/acento | `#92203a` |
| `success` | Exito, stock normal, cobrado | `#1f8b5f` |
| `warning` | Alerta no bloqueante, stock bajo | `#b7791f` |
| `danger` | Error, sin stock, eliminar | `#b4233c` |
| `info` | Informacion, filtros, datos neutros | `#2563eb` |
| `background` | Fondo general | `#eef2f8` |
| `surface` | Cards, dialogs, tablas | `#ffffff` |
| `surface-soft` | Inputs, filas hover, bloques secundarios | `#f6f8fc` |
| `text-primary` | Titulos y datos principales | `#10233f` |
| `text-secondary` | Ayudas, metadata, labels | `#4e5f76` |
| `border` | Divisores y contornos | `#d8e0ec` |
| `hover` | Hover de filas/links | `#d8e5f9` |

Reglas:

- No usar hex directos en componentes nuevos salvo visualizaciones/charts.
- Los charts pueden usar: primary data `#17c3b2`, comparison `#5a9bff`, warning `#ffc857`, danger `#ff6b6b`.
- Analytics debe migrar a tokens compartidos o a un modo oscuro global equivalente, no a un tema aislado.

### Tipografia

Familia oficial: `Manrope`, fallback `Segoe UI`, `sans-serif`.

Jerarquia:

- H1 pantalla: 28-38 px, peso 800/900, margen inferior 16 px.
- H2 seccion: 20-24 px, peso 800, margen superior segun bloque.
- H3 panel/card: 15-18 px, peso 800.
- Kicker/eyebrow: 12-13 px, uppercase, peso 800/900, letter spacing maximo `0.11em`.
- Body: 15-16 px, peso 400/500.
- Texto secundario: 13-14 px, color `text-secondary`.
- Tabla: 13-15 px; headers 11-12 px uppercase peso 900.

Reglas:

- No mezclar idioma en UI. Idioma oficial: espanol neutro.
- Corregir codificacion antes de validar cualquier pantalla.
- Evitar titulares enormes en pantallas operativas.

### Espaciado

Escala oficial:

- `4px`: micro separaciones internas.
- `8px`: gaps compactos, grupos de acciones.
- `10px`: padding de controles compactos.
- `12px`: padding base de inputs, badges, filas.
- `16px`: gap entre bloques relacionados.
- `20px`: padding de panel/drawer compacto.
- `24px`: padding de pagina/card principal.
- `32px`: separacion entre secciones mayores.

Reglas:

- `.page`: padding 24 px desktop, 16 px mobile.
- Cards/panels: gap interno 12-18 px.
- Formularios: gap 12-14 px entre campos.
- Tablas: padding de celda 10-12 px.
- No introducir gaps arbitrarios si ya existe equivalente en la escala.

### Radios, Bordes y Sombras

- `radius-sm`: 10 px para inputs, botones, badges rectangulares.
- `radius-md`: 12 px para panels compactos, summary boxes.
- `radius-lg`: 18 px para cards y modales.
- Maximo recomendado: 20 px para auth/dialogs especiales.
- Borde estandar: `1px solid var(--border)`.
- Sombra estandar: `var(--shadow-soft)` para cards importantes.
- Sombra profunda: `var(--shadow-deep)` solo modales, drawers y auth.

Evitar `rounded-2xl` indiscriminado en componentes operativos nuevos.

## 4. Componentes Oficiales

### Layout de Pagina

Usar:

- `.page` para paginas claras.
- Header con kicker + H1 + estado/accion contextual.
- `max-width`: 1080 para paginas simples, 1180 POS, 1280 dashboards densos.

Toda pagina debe tener:

- Titulo claro.
- Estado de carga.
- Estado vacio si aplica.
- Feedback de error si aplica.
- Accion primaria visible cuando corresponda.

### Navbar

Variante oficial:

- Sticky top, fondo `surface` translucido, borde inferior.
- Links con estado activo, hover y focus visible.
- Labels en espanol: Inicio, Administracion, Analitica, Inventario, POS, Panel.
- Cerrar sesion como boton secundario.

No crear navs locales dentro de dashboards salvo breadcrumbs o tabs.

### Sidebar

Usar solo si la navegacion crece.

- Fondo `surface`.
- Borde derecho `border`.
- Item activo con `surface-soft`, texto `text-primary`, borde/acento `primary-light`.
- Item secundario con `text-secondary`.
- Iconos lucide opcionales con label visible.

### Buttons

Variantes oficiales:

- Primary: gradiente `primary -> secondary`, texto blanco, peso 800/900.
- Secondary: `surface-soft`, borde `border`, texto `text-primary`.
- Ghost: transparente, texto `text-secondary`, hover `hover`.
- Danger: fondo `danger`, texto blanco, solo para acciones destructivas.
- Icon: cuadrado 32-40 px, icono lucide, `aria-label` obligatorio.

Estados obligatorios:

- Hover.
- Disabled.
- Loading cuando dispare accion async.
- `focus-visible` con ring `primary-light`.

No usar botones nativos sin clase en nuevas interfaces.

### Inputs y Selects

Variante oficial:

- Alto minimo 40 px.
- Padding 10-12 px.
- Borde `border`.
- Fondo `surface-soft`.
- Focus: borde `primary-light`, ring `rgba(22, 52, 93, 0.16)`.
- Label visible o `aria-label` si el contexto visual lo justifica.
- Error debajo del campo en `danger`.

No usar placeholder como unico label en formularios permanentes.

### Checkboxes

- Usar `accent-color: secondary`.
- Label clickeable.
- Texto 14 px, `text-secondary` salvo configuraciones criticas.
- Focus visible.

### Cards y Panels

Variantes:

- Card base: `surface`, borde `border`, radio `lg`, padding 16-24, sombra suave.
- Metric card: `surface`, radio `md`, min-height estable, label uppercase, valor destacado.
- Panel denso: `surface`, borde, radio `md`, sin sombra fuerte.
- Chart panel: mismo contenedor que card/panel, con altura estable.

No anidar cards dentro de cards salvo items repetidos dentro de un panel de lista.

### Tablas

Variante oficial:

- Contenedor con borde, radio `md`, overflow hidden.
- Header sticky cuando la tabla pueda scrollear.
- Headers uppercase, peso 900, `text-secondary`.
- Fila hover `surface-soft`.
- Empty row centrado con padding 24-32 px.
- Acciones agrupadas a la derecha.

Accesibilidad:

- Sort debe indicar activo visualmente y con texto/atributo accesible.
- Botones de acciones deben tener labels claros; iconos solo con tooltip/aria-label.

### Badges

Variantes:

- Success: stock normal, cobrado, activo.
- Warning: stock bajo, deuda, pendiente.
- Danger: sin stock, error, devolucion critica.
- Info: filtros activos, metadata.
- Neutral: estado informativo sin severidad.

Forma: pill, min-height 24-26 px, padding 5-9 px, peso 800/900.

### Alertas

Variantes:

- Error: borde/fondo danger suave, `role="alert"`.
- Success: borde/fondo success suave.
- Warning: borde/fondo warning suave.
- Info: borde/fondo info suave.

Reglas:

- No usar `alert()` del navegador.
- Mensajes async deben estar cerca de la accion o arriba del area afectada.
- Errores de formulario deben indicar campo y solucion.

### Modales y Drawers

Modal:

- Overlay fijo oscuro.
- Dialog `surface`, radio `lg`, sombra profunda.
- `role="dialog"`, `aria-modal="true"`, titulo asociado.
- Boton cerrar iconico con `aria-label`.
- Escape cierra si no hay operacion critica.
- Foco inicial dentro del dialog.

Drawer:

- Usar para formularios laterales extensos, como producto.
- Ancho maximo 460-520 px.
- Header con contexto + titulo + cierre.
- Acciones al final o submit persistente.

### Tooltips

- Usar para iconos no evidentes.
- Deben ser breves y no reemplazar labels criticos.
- No depender solo de tooltip para flujos esenciales.

## 5. Guia UX

### Navegacion

- Cada rol debe ver solo rutas relevantes.
- La navegacion principal debe mantenerse consistente en todas las pantallas autenticadas.
- Las acciones principales de pagina van en el header, no perdidas dentro de la tabla.
- Usar tabs solo para sub-vistas del mismo recurso.

### Feedback Visual

- Cada accion async debe mostrar estado: cargando, exito o error.
- El feedback debe persistir lo suficiente para ser leido.
- Cambios en tablas pueden usar highlight temporal, como el POS, pero con color tokenizado.

### Estados de Carga

Preferencia:

1. Skeleton/placeholder para cards y tablas densas.
2. Spinner pequeno dentro de botones.
3. Texto de carga solo en casos simples.

No dejar pantallas enteras vacias durante fetch inicial.

### Estados Vacios

Todo listado debe tener:

- Mensaje claro.
- Causa probable si aplica.
- Accion siguiente cuando exista: limpiar filtros, crear producto, registrar venta.

Ejemplo: "No hay productos que coincidan con los filtros. Limpia la busqueda o crea un producto nuevo."

### Manejo de Errores

- Usar mensajes en espanol y orientados a accion.
- Evitar mensajes tecnicos crudos.
- Los errores globales van arriba del area afectada.
- Los errores de campo van debajo del input.
- Errores de permiso deben explicar que el rol actual no puede acceder.

### Confirmaciones

Requieren confirmacion:

- Eliminar o cancelar datos persistentes.
- Registrar venta con deuda/fiado.
- Ajustes manuales de stock negativos.
- Cambios de rol o permisos.

No requieren confirmacion:

- Filtros.
- Navegacion no destructiva.
- Ediciones reversibles sin guardar.

### Responsive Design

- Mobile primero para formularios, desktop denso para tablas.
- Usar grid que colapse a una columna bajo 520-640 px.
- Tablas pueden mantener scroll horizontal si son operativas, pero deben conservar primera columna legible.
- Botones principales deben ocupar ancho disponible en mobile cuando esten solos.
- No permitir overlap ni texto cortado en botones/cards.

### Accesibilidad

Checklist obligatorio:

- Todo control tiene label visible o `aria-label`.
- Focus visible en links, botones, inputs y selects.
- Modales/drawers declaran `role`, `aria-modal` y titulo.
- Mensajes de error usan `role="alert"` cuando aparecen dinamicamente.
- Contraste minimo WCAG AA.
- Navegacion y acciones son utilizables con teclado.
- Iconos decorativos usan `aria-hidden`; iconos funcionales tienen nombre accesible.
- No se transmite estado solo por color.

## 6. Reglas de Revision del Agente

Cuando revise un cambio frontend, el Agente UI/UX debe emitir:

1. Veredicto: aprobado, aprobado con observaciones o requiere cambios.
2. Componentes/paginas afectadas.
3. Tokens usados o violados.
4. Componentes existentes que deberian reutilizarse.
5. Riesgos UX/accesibilidad.
6. Ajustes requeridos antes de merge.

### Preguntas de Control

- Usa tokens en vez de colores hardcodeados?
- Reutiliza patrones existentes de card, boton, input, alerta, tabla o modal?
- Mantiene idioma y tono en espanol?
- Incluye estados loading/error/empty/success?
- Tiene labels, roles y focus visible?
- Respeta la escala de espaciado?
- Evita duplicar una variante ya existente?
- La pantalla nueva se parece a Kiosko Escolar y no a un producto separado?

### Criterios de Rechazo

Rechazar cambios que:

- Agreguen hex, gradientes o paletas nuevas sin actualizar tokens.
- Introduzcan botones/inputs sin clase o sin focus visible.
- Creen una card, tabla, modal o alerta nueva cuando exista patron equivalente.
- Mezclen ingles/espanol en UI visible.
- Usen `alert()`, `confirm()` o feedback del navegador para flujos de app.
- No contemplen estados vacios o errores en listados/fetches.
- Rompan navegacion por teclado o contraste.

## 7. Propuesta de Refactorizaciones

### Alta Prioridad

1. Unificar Analytics con el sistema visual global.
   - Mapear `panel`, `panelSoft`, `panelBorder`, `accent`, `ink` a tokens globales.
   - Decidir si el dashboard sera claro como el resto o si se implementara modo oscuro global coherente.

2. Crear componentes UI base reutilizables.
   - `Button`, `Input`, `Select`, `Card`, `Alert`, `Badge`, `Table`, `Modal`, `Drawer`.
   - Migrar primero Inventario, POS y Auth, que ya tienen patrones solidos.

3. Redisenar RegisterPage para compartir el shell de LoginPage.
   - Mismo layout, labels, errores, boton primario y link de retorno.

4. Profesionalizar AdminDashboard y ClientPanel.
   - Reemplazar listas simples por cards/resumen/tablas con estados vacios y carga.
   - Usar textos en espanol y acciones claras.

5. Corregir codificacion e idioma visible.
   - Reemplazar caracteres rotos.
   - Normalizar `Loading`, `Saving`, `Paid`, `Pending`, `No client`, `Products`, `Admin Dashboard`.

6. Sustituir `alert()` en ManualAdjustment.
   - Usar alerta success/error dentro de la app.

### Media Prioridad

1. Formalizar tokens en Tailwind y CSS.
   - Evitar duplicidad entre `tailwind.config.js` y `main.css`.

2. Estandarizar modales y drawers.
   - Base compartida con foco inicial, Escape, cierre, overlay y aria.

3. Mejorar acciones de tabla.
   - Usar iconos lucide con labels/tooltip o botones secundarios consistentes.

4. Mejorar empty states.
   - Mensaje + accion contextual para inventario, reservas, movimientos, rankings y cliente.

5. Agregar `role="alert"` y focus visible uniforme.
   - Especialmente POS, Inventario, Analytics y formularios.

6. Documentar charts.
   - Paleta oficial, tooltip, leyenda, estados sin datos.

### Baja Prioridad

1. Incorporar sidebar si crece la navegacion administrativa.
2. Crear skeleton loaders para dashboards y tablas.
3. Agregar tooltips consistentes a iconos y acciones compactas.
4. Definir microinteracciones oficiales para hover, row highlight y drawer enter.
5. Crear pruebas visuales/snapshots para paginas principales.
6. Evaluar tema oscuro global luego de consolidar el tema claro.

## 8. Plan de Implementacion Futuro

Orden recomendado cuando se autoricen cambios de codigo:

1. Crear tokens compartidos y componentes UI base.
2. Migrar Register/Auth completo.
3. Migrar AdminDashboard y ClientPanel desde prototipo a pantallas reales.
4. Unificar botones, inputs, alerts y cards en POS e Inventario.
5. Migrar Analytics a tokens globales.
6. Reemplazar feedback nativo y completar accesibilidad.
7. Agregar documentacion de ejemplos visuales o storybook ligero si el proyecto crece.

## 9. Checklist Rapido Para Nuevas Pantallas

- Usa `.page` o layout oficial.
- Tiene header con titulo claro.
- Usa tokens oficiales.
- Usa componentes base o patrones documentados.
- Tiene loading, error y empty state.
- Usa espanol consistente.
- Tiene labels y focus visible.
- Es usable en mobile.
- No duplica componentes existentes.
- No introduce estilos aislados por pantalla.

