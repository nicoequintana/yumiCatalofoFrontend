import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearOrdenDeTest,
  borrarOrdenDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
} from "./helpers/db.js";

/**
 * Verificación en navegador del admin responsive (proyecto `mobile`, Pixel 7
 * = 412x915). Prueba layout real, no unidades: los `*.test.jsx` con jsdom no
 * pueden medir `getBoundingClientRect()` ni aplicar los `@media` de
 * `index.css` — este spec sí corre contra un navegador Chromium real, así
 * que es la única red que atrapa un desborde horizontal, un `<h1>` tapado o
 * un área táctil angosta.
 *
 * Fixtures: un admin + un producto (con foto, nombre reconocible
 * `E2E-TEST-…`) + una orden de test, sembrados una sola vez en `beforeAll`
 * (no hace falta un producto/orden distinto por escenario: acá se mide
 * layout, no se mutan datos).
 *
 * ⚠️ **TODO VA EN UN SOLO `test()` CON `test.step`, Y ESO NO ES PEREZA: el
 * login tiene rate limit de 8 intentos cada 15 minutos por IP**
 * (`POST /auth/login`, ver `auth.routes.js`). Este spec tenía seis `test()`,
 * cada uno con su propio login por UI —cada test de Playwright corre en su
 * propio contexto de navegador y no hereda el `localStorage` del anterior—,
 * así que él solo se comía seis de los ocho intentos del cupo: corrido después
 * de la suite de escritorio, o dos veces seguidas, los últimos escenarios
 * fallaban con "sigo en /catalogo/admin/login" y el mensaje no señalaba al
 * rate limit por ningún lado. Mismo criterio que `admin-grilla-ordenes.spec.js`
 * y que `admin-campania-editor.spec.js`.
 *
 * El costo asumido es el mismo que allá: **un paso que falla tapa a los que
 * siguen**. A cambio, una corrida de este spec gasta UN intento y no seis.
 *
 * Si aun así varios pasos caen en `/catalogo/admin/login`, es el cupo agotado
 * y no el código: hay que esperar 15 minutos, no reintentar en bucle.
 */
test.describe("Admin en mobile", () => {
  // Los seis escenarios viven en un test, así que el presupuesto de tiempo es
  // la SUMA de todos: dieciocho rutas recorridas de a una, más el drawer, la
  // tabla apilada, las áreas táctiles y el diálogo. Los 30 s del default de
  // `playwright.config.js` alcanzaban para un escenario suelto, no para la
  // tanda entera — y agrandar el default de TODA la suite por este spec sería
  // subir el techo donde no hace falta.
  test.describe.configure({ timeout: 180_000 });

  let producto;
  let orden;
  let usuarioAdmin;

  test.beforeAll(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Mobile",
      precio: "5500",
    });

    orden = await crearOrdenDeTest({
      estado: "PENDIENTE",
      items: [
        {
          productId: producto.id,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio.toString(),
          cantidad: 1,
        },
      ],
    });

    usuarioAdmin = await crearUsuarioAdminDeTest();
  });

  test.afterAll(async () => {
    if (orden?.id) {
      await borrarOrdenDeTest(orden.id, orden.clienteId);
    }
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
    if (usuarioAdmin?.id) {
      await borrarUsuarioAdminDeTest(usuarioAdmin.id);
    }
  });

  /**
   * Espera a que la pantalla terminó de cargar antes de medir nada: el
   * `<h1>` visible y ningún `Spinner` de carga (`role="status"`,
   * `aria-label="Cargando"`, ver `components/Spinner.jsx`) en pantalla.
   *
   * Hace falta para las DIECIOCHO rutas por igual: varias (el detalle de orden, el
   * editor de producto) ni siquiera montan su `<h1>` mientras cargan — el
   * `Spinner` ocupa toda la pantalla solo — así que esperar el `<h1>` ya
   * cubre ese caso, y el segundo `expect` cubre el resto (listados que sí
   * muestran su `<h1>` de entrada y solo reemplazan la tabla por un spinner).
   */
  async function esperarPantallaLista(page) {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("status", { name: "Cargando" })).toHaveCount(0);
  }

  /** ¿Se superponen dos `boundingBox()`? */
  function seIntersectan(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  test("layout del panel en un teléfono: desborde, cinta, drawer, tabla apilada, áreas táctiles y diálogo", async ({
    page,
  }) => {
    await test.step("login real por el formulario", async () => {
      await page.goto("/catalogo/admin/login");
      await page.getByLabel("Email").fill(usuarioAdmin.email);
      // `exact: true`: el campo de contraseña convive con el botón "Mostrar
      // contraseña" del ojito (`CampoPassword`), cuyo nombre accesible también
      // contiene "contraseña" — sin `exact`, `getByLabel` matchea los dos.
      await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
      await page.getByRole("button", { name: "Ingresar" }).click();
      // ⚠️ Si esto cae en `/catalogo/admin/login`, lo más probable NO es un bug
      // de la UI sino el cupo de 8 logins cada 15 minutos, agotado por otra
      // corrida. Ver el encabezado del archivo.
      await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);
    });

    await test.step("ninguna pantalla desborda ni tapa el título", async () => {
      // Las dieciocho rutas del panel, recorridas de a una: el login es el
      // costo caro (rate limit de 8/15min en el backend) y `test.step` ya
      // identifica cuál falló sin necesidad de un test por ruta.
      const rutas = [
        "/catalogo/admin/productos",
        "/catalogo/admin/ordenes",
        `/catalogo/admin/ordenes/${orden.id}`,
        "/catalogo/admin/ordenes/productos-solicitados",
        "/catalogo/admin/productos/precios",
        "/catalogo/admin/productos/salud",
        "/catalogo/admin/productos/importar",
        "/catalogo/admin/productos/actualizar-masivo",
        "/catalogo/admin/logs",
        "/catalogo/admin/configuracion/categorias",
        "/catalogo/admin/configuracion/usuarios",
        "/catalogo/admin/configuracion/anuncios",
        "/catalogo/admin/ventas",
        "/catalogo/admin/embudo",
        "/catalogo/admin/clientes",
        "/catalogo/admin/operacion",
        "/catalogo/admin/metricas",
        `/catalogo/admin/productos/${producto.id}/editar`,
      ];

      for (const ruta of rutas) {
        // eslint-disable-next-line no-loop-func
        await test.step(ruta, async () => {
          await page.goto(ruta);
          await esperarPantallaLista(page);

          // (a) Sin desborde horizontal. `document.documentElement.scrollWidth`
          // solo, no alcanza: el `overflow-x-clip` del `<main>` (Task 0) corta
          // el desborde SIN convertirlo en scroll container, así que puede
          // enmascarar un `scrollWidth` que en otra pantalla sí lo delataría.
          // Las cajas de cada `table`/`tr` no mienten aunque el recorte visual
          // las tape: si el borde derecho pasa el viewport, el contenido
          // desborda igual.
          const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          expect(scrollWidth, `${ruta}: document.documentElement.scrollWidth`).toBeLessThanOrEqual(
            innerWidth,
          );

          for (const tabla of await page.locator("table").all()) {
            const caja = await tabla.boundingBox();
            if (!caja) continue;
            expect(
              caja.x + caja.width,
              `${ruta}: table.getBoundingClientRect().right`,
            ).toBeLessThanOrEqual(innerWidth);
          }
          for (const fila of await page.locator("tbody > tr").all()) {
            const caja = await fila.boundingBox();
            if (!caja) continue;
            expect(
              caja.x + caja.width,
              `${ruta}: tbody>tr.getBoundingClientRect().right`,
            ).toBeLessThanOrEqual(innerWidth);
          }

          // (b) El `<h1>` no queda tapado por el botón "Abrir menú" de la barra
          // superior (las dos cosas viven en flujos distintos del layout, pero
          // nada impide que un `<h1>` largo se corra debajo si el layout se
          // rompe).
          const cajaH1 = await page.getByRole("heading", { level: 1 }).boundingBox();
          const cajaBoton = await page.getByRole("button", { name: "Abrir menú" }).boundingBox();
          expect(cajaH1, `${ruta}: boundingBox del h1`).not.toBeNull();
          expect(cajaBoton, `${ruta}: boundingBox del botón "Abrir menú"`).not.toBeNull();
          expect(
            seIntersectan(cajaH1, cajaBoton),
            `${ruta}: el h1 se superpone con el botón de menú`,
          ).toBe(false);
        });
      }
    });

    // Órdenes apila su tabla como el resto del panel — dejó de ser el tablero
    // Kanban de una columna por vez (07/09/2026). Lo que sí tiene de propio es
    // la fila de EXPANSIÓN del resumen: en mobile no puede leerse como una
    // tarjeta más de la lista, tiene que quedar pegada a la tarjeta de su orden.
    await test.step("/catalogo/admin/ordenes: la tabla apila y el resumen se despliega dentro de la tarjeta", async () => {
      await page.goto("/catalogo/admin/ordenes");
      await esperarPantallaLista(page);

      const tabla = page.getByRole("table").first();
      await expect(tabla).toHaveCSS("display", "block");

      // La fila de la orden sembrada, ubicada por su celda de identidad. El
      // regex va anclado: `#41` es subcadena de `#418`.
      const fila = page.locator("tbody > tr").filter({
        has: page.locator('td[data-celda="identidad"]', {
          hasText: new RegExp(`^#${orden.id}$`),
        }),
      });
      await expect(fila).toHaveCount(1);

      // Apilada, cada `<tr>` es una tarjeta (`display: flex`) y cada `<td>` con
      // `data-label` dibuja su rótulo con `::before { content: attr(data-label) }`.
      // Eso es CSS puro que jsdom no aplica: `AdminOrdenes.test.jsx` solo puede
      // afirmar el atributo, y este spec es el único lugar donde se puede leer
      // el rótulo REALMENTE renderizado.
      await expect(fila).toHaveCSS("display", "flex");
      const rotuloTotal = await fila
        .locator('td[data-label="Total"]')
        .evaluate((td) => getComputedStyle(td, "::before").content);
      expect(rotuloTotal, "rótulo renderizado de la celda Total").toContain("Total");

      // El grupo de chips de estado se llama "Estado" (sale del rótulo VISIBLE
      // de la barra de filtros, no de un `aria-label` propio).
      const grupoEstado = page.getByRole("group", { name: "Estado" });
      await expect(grupoEstado.getByRole("button", { name: /^Pendiente/ })).toBeVisible();

      // El resumen abre DENTRO de la tarjeta de su orden: la fila de expansión
      // es la hermana inmediata, se monta el borde entre las dos y el margen
      // negativo cancela el `gap` del tbody. Sin eso queda un cartel suelto
      // debajo de la orden, que es justo lo que el despliegue vino a evitar.
      await page
        .getByRole("button", { name: new RegExp(`productos de la orden #${orden.id}$`) })
        .click();

      const expansion = page.locator('tr[data-fila="expansion"]');
      await expect(expansion).toHaveCount(1);

      const pegada = await page.evaluate((ordenId) => {
        const celda = [...document.querySelectorAll('td[data-celda="identidad"]')].find(
          (td) => td.textContent.trim() === `#${ordenId}`,
        );
        const filaOrden = celda?.closest("tr");
        const siguiente = filaOrden?.nextElementSibling;
        return {
          esHermanaInmediata: siguiente?.dataset.fila === "expansion",
          margenSuperior: siguiente ? getComputedStyle(siguiente).marginTop : null,
          bordeInferiorDeLaOrden: filaOrden ? getComputedStyle(filaOrden).borderBottomWidth : null,
        };
      }, orden.id);

      expect(pegada.esHermanaInmediata, "la fila de expansión sigue a la de su orden").toBe(true);
      expect(
        Number.parseFloat(pegada.margenSuperior),
        "el margen negativo que cancela el gap entre tarjetas",
      ).toBeLessThan(0);
      expect(
        pegada.bordeInferiorDeLaOrden,
        "la tarjeta de la orden pierde el borde que la separaba del resumen",
      ).toBe("0px");
    });

    /**
     * La cinta de dev (`CintaAmbiente.jsx`) sale en este spec porque Playwright
     * corre contra `npm run dev` (`import.meta.env.DEV` es `true`) — nunca
     * aparece en un build de producción, ver CLAUDE.md. Es `fixed` y no empuja
     * el layout: antes de este fix se pintaba encima de la mitad superior de la
     * barra del admin, tapando la hamburguesa, el wordmark y el toggle de tema.
     * El fix la hace declarar su alto en `--alto-cinta-ambiente`
     * (`index.css`), que la barra lee en su `top`. `AdminLayout.test.jsx` ya
     * fija la clase; esto mide en un navegador real que el acomodo ocurrió de
     * verdad — jsdom no puede medir `getBoundingClientRect()`.
     */
    await test.step("la cinta de ambiente de testing no tapa la barra superior del admin", async () => {
      await page.goto("/catalogo/admin/productos");
      await esperarPantallaLista(page);

      const cinta = page.getByTestId("cinta-ambiente");
      await expect(cinta).toBeVisible();
      const cajaCinta = await cinta.boundingBox();

      const botonMenu = page.getByRole("button", { name: "Abrir menú" });
      const cajaBoton = await botonMenu.boundingBox();

      expect(cajaCinta, "boundingBox de la cinta de ambiente").not.toBeNull();
      expect(cajaBoton, 'boundingBox del botón "Abrir menú"').not.toBeNull();
      expect(
        cajaBoton.y,
        "el botón Abrir menú empieza por debajo del borde inferior de la cinta",
      ).toBeGreaterThanOrEqual(cajaCinta.y + cajaCinta.height);

      const punto = { x: cajaBoton.x + cajaBoton.width / 2, y: cajaBoton.y + cajaBoton.height / 2 };
      const impacto = await page.evaluate(({ x, y }) => {
        const elemento = document.elementFromPoint(x, y);
        if (!elemento) return { hayElemento: false, esBotonDeMenu: false, dentroDeLaCinta: false };
        return {
          hayElemento: true,
          esBotonDeMenu: Boolean(elemento.closest('button[aria-label="Abrir menú"]')),
          dentroDeLaCinta: Boolean(elemento.closest('[data-testid="cinta-ambiente"]')),
          // Para el reporte, si algo falla: qué recibe el toque en su lugar.
          descripcion: `${elemento.tagName.toLowerCase()}.${String(elemento.className).trim()}`,
        };
      }, punto);

      expect(impacto.hayElemento, "elementFromPoint sobre el centro del botón de menú").toBe(true);
      expect(
        impacto.esBotonDeMenu,
        `el botón "Abrir menú" recibe el toque en su centro (impacto real: ${impacto.descripcion})`,
      ).toBe(true);
      expect(impacto.dentroDeLaCinta, "la cinta de ambiente no intercepta el toque").toBe(false);
    });

    // El nombre dice exactamente lo que el paso afirma. Se llamaba "abre con
    // foco atrapado…" y eso prometía algo que acá no se mide: la trampa de foco
    // (tabular en círculo dentro del drawer) vive en `hooks/useDialogo.js` y no
    // es una propiedad del layout, que es de lo que trata este spec.
    await test.step("drawer: Escape lo cierra y devuelve el foco al botón", async () => {
      await page.goto("/catalogo/admin/productos");
      await esperarPantallaLista(page);

      const botonMenu = page.getByRole("button", { name: "Abrir menú" });
      await botonMenu.click();

      const drawer = page.getByRole("dialog", { name: "Menú" });
      await expect(drawer).toBeVisible();
      expect(await drawer.evaluate((el) => el.inert)).toBe(false);

      await page.keyboard.press("Escape");

      expect(await drawer.evaluate((el) => el.inert)).toBe(true);
      // Cerrado, el drawer se corre fuera de pantalla con `-translate-x-full`
      // en vez de desmontarse (para poder animar la transición) — su
      // `boundingBox().x` negativo confirma que salió del viewport.
      const cajaDrawer = await drawer.boundingBox();
      expect(cajaDrawer.x, "el drawer cerrado sale de pantalla hacia la izquierda").toBeLessThan(0);
      await expect(botonMenu).toBeFocused();
    });

    await test.step("tabla apilada conserva semántica en /productos", async () => {
      await page.goto("/catalogo/admin/productos");
      await esperarPantallaLista(page);

      const tabla = page.getByRole("table").first();
      await expect(tabla).toBeVisible();
      await expect(tabla).toHaveCSS("display", "block");

      await expect(tabla.getByRole("cell", { name: /E2E/ }).first()).toBeVisible();
      // El `thead` queda visualmente sr-only en mobile (clip-rect, no
      // `display: none`): sigue en el árbol de accesibilidad, pero `includeHidden`
      // hace explícito que la búsqueda no debe descartarlo por su tamaño de 1px.
      await expect(
        tabla.getByRole("columnheader", { name: "Precio", includeHidden: true }),
      ).toBeAttached();
    });

    await test.step("áreas táctiles en /productos: switch y checkbox alcanzan el mínimo recomendado", async () => {
      await page.goto("/catalogo/admin/productos");
      await esperarPantallaLista(page);

      // Discrepancia con el brief: `page.getByRole("switch").first()` SIN
      // acotar a la tabla matchea el toggle de modo oscuro de la barra
      // superior (`ToggleTemaAdmin`, también `role="switch"` y anterior en el
      // DOM al `<table>`), no el toggle "Catálogo" de la primera fila que este
      // paso quiere medir — los dos comparten rol pero no layout ni tamaño. Se
      // acota con `getByRole("table").getByRole(...)` para tomar el switch que
      // de verdad prueba Task 2 (24x44 en mobile).
      const tabla = page.getByRole("table").first();
      const switchToggle = tabla.getByRole("switch").first();
      const cajaSwitch = await switchToggle.boundingBox();
      expect(cajaSwitch.height, "alto del switch").toBeGreaterThanOrEqual(24);
      expect(cajaSwitch.width, "ancho del switch").toBeGreaterThanOrEqual(44);

      const celdaSwitch = switchToggle.locator("xpath=ancestor::td[1]");
      const cajaCelda = await celdaSwitch.boundingBox();
      expect(cajaCelda.height, "alto de la celda que contiene el switch").toBeGreaterThanOrEqual(44);

      // Se mide el checkbox de una FILA, no el "Seleccionar todos" del
      // encabezado: ese quedó `max-md:hidden` porque debajo de `md` el `thead`
      // es sr-only (1px) y el control era una parada de foco invisible e
      // intocable. Acotar a `tbody` es lo que hace que este paso mida el área
      // táctil que una persona puede tocar de verdad en mobile.
      const checkbox = tabla.locator("tbody").getByRole("checkbox", { name: /seleccionar/i }).first();
      const etiqueta = checkbox.locator("xpath=ancestor::label[1]");
      const cajaEtiqueta = await etiqueta.boundingBox();
      expect(cajaEtiqueta.width, "ancho del área táctil del checkbox").toBeGreaterThanOrEqual(44);
      expect(cajaEtiqueta.height, "alto del área táctil del checkbox").toBeGreaterThanOrEqual(44);
    });

    /**
     * La garantía que jsdom NO puede dar: con un diálogo abierto, NADA de la
     * barra superior queda alcanzable. Es la medición real del contexto de
     * apilamiento de `AdminLayout` — con el `relative z-10` en el `<main>` (y
     * no en el contenedor que envuelve barra + contenido), el `<header>` `z-30`
     * se pintaba SOBRE el modal y dejaba una banda de 56px con hamburguesa y
     * toggle de tema tocables por encima de un diálogo modal.
     *
     * `elementFromPoint` es lo que lo prueba y no un `toBeVisible()`: el header
     * sigue estando visible y en su lugar en los dos casos — lo que cambia es
     * QUIÉN recibe el toque en esas coordenadas.
     *
     * Va ÚLTIMO a propósito: es el único paso que deja una fila seleccionada, y
     * la barra de acción masiva que eso monta cambiaría el layout que miden los
     * pasos de arriba.
     */
    await test.step("con un diálogo abierto, la barra superior deja de ser alcanzable", async () => {
      await page.goto("/catalogo/admin/productos");
      await esperarPantallaLista(page);

      const tabla = page.getByRole("table").first();
      await tabla.locator("tbody").getByRole("checkbox", { name: /seleccionar/i }).first().check();
      await page.getByRole("button", { name: "Eliminar seleccionados" }).click();

      const dialogo = page.getByRole("dialog", { name: "Eliminar productos" });
      await expect(dialogo).toBeVisible();

      const botonMenu = page.getByRole("button", { name: "Abrir menú" });
      const cajaBoton = await botonMenu.boundingBox();
      expect(cajaBoton, 'boundingBox del botón "Abrir menú"').not.toBeNull();

      const punto = { x: cajaBoton.x + cajaBoton.width / 2, y: cajaBoton.y + cajaBoton.height / 2 };
      const impacto = await page.evaluate(({ x, y }) => {
        const elemento = document.elementFromPoint(x, y);
        if (!elemento) return { hayElemento: false, esBotonDeMenu: false, dentroDelHeader: false };
        return {
          hayElemento: true,
          esBotonDeMenu: Boolean(elemento.closest('button[aria-label="Abrir menú"]')),
          dentroDelHeader: Boolean(elemento.closest("header")),
          // Para el reporte: qué recibe el toque en vez de la barra.
          descripcion: `${elemento.tagName.toLowerCase()}.${String(elemento.className).trim()}`,
        };
      }, punto);

      expect(impacto.hayElemento, "elementFromPoint sobre el botón de menú").toBe(true);
      expect(
        impacto.esBotonDeMenu,
        `el botón "Abrir menú" sigue recibiendo el toque con el diálogo abierto (impacto: ${impacto.descripcion})`,
      ).toBe(false);
      expect(
        impacto.dentroDelHeader,
        `la barra superior sigue recibiendo el toque con el diálogo abierto (impacto: ${impacto.descripcion})`,
      ).toBe(false);

      // Cancelar, no confirmar: este paso mide layout, no borra nada.
      await dialogo.getByRole("button", { name: "Cancelar" }).click();
      await expect(dialogo).toBeHidden();
    });
  });
});
