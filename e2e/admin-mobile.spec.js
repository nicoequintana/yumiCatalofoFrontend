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
 * (no hace falta un producto/orden distinto por test: estos tests miden
 * layout, no mutan datos). Login por UI en cada test —mismo patrón que
 * `admin-cambio-estado.spec.js`—, porque cada test de Playwright corre en su
 * propio contexto de navegador y no comparte `localStorage` con los demás.
 */
test.describe("Admin en mobile", () => {
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

  test.beforeEach(async ({ page }) => {
    await page.goto("/catalogo/admin/login");
    await page.getByLabel("Email").fill(usuarioAdmin.email);
    // `exact: true`: el campo de contraseña convive con el botón "Mostrar
    // contraseña" del ojito (`CampoPassword`), cuyo nombre accesible también
    // contiene "contraseña" — sin `exact`, `getByLabel` matchea los dos.
    await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);
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

  test("ninguna pantalla desborda ni tapa el título", async ({ page }) => {
    // Las dieciocho rutas del panel, en un único test: el login es el costo
    // caro (rate limit de 8/15min en el backend) y `test.step` ya identifica
    // cuál falló sin necesidad de un test por ruta.
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
          expect(caja.x + caja.width, `${ruta}: table.getBoundingClientRect().right`).toBeLessThanOrEqual(
            innerWidth,
          );
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
        expect(seIntersectan(cajaH1, cajaBoton), `${ruta}: el h1 se superpone con el botón de menú`).toBe(
          false,
        );
      });
    }

    // El tablero de órdenes es la única pantalla del panel que NO apila una
    // tabla en mobile: muestra UNA columna por vez, elegida con tabs. Va como
    // un paso más de este test —y no como uno propio— porque el login tiene
    // rate limit de 8 intentos cada 15 minutos por IP y este spec ya usa seis.
    await test.step("/catalogo/admin/ordenes: una sola columna visible y los tabs la cambian", async () => {
      await page.goto("/catalogo/admin/ordenes");
      await esperarPantallaLista(page);

      // Las CUATRO columnas se MONTAN siempre —hacen falta las cuatro
      // respuestas para que los contadores de los tabs digan la verdad—, así
      // que se cuentan con un selector de DOM crudo.
      //
      // ⚠️ `getByRole` NO sirve para contarlas: las tres ocultas son
      // `display: none`, y eso las saca del árbol de accesibilidad. Mismo
      // gotcha que `admin-desktop-layout.spec.js` documenta con el drawer.
      // Que el rol devuelva exactamente UNA es justamente la prueba de que
      // solo una columna se ve.
      const montadas = await page.evaluate(() =>
        ["Pendiente:", "En preparación:", "Entregada:", "Cancelada:"].filter((prefijo) =>
          document.querySelector(`section[aria-label^="${prefijo}"]`),
        ).length,
      );
      expect(montadas, "columnas montadas en el DOM").toBe(4);

      await expect(
        page.getByRole("region", { name: /^(Pendiente|En preparación|Entregada|Cancelada):/ }),
      ).toHaveCount(1);

      await expect(page.getByRole("region", { name: /^Pendiente:/ })).toBeVisible();
      await page
        .getByRole("group", { name: "Filtrar por estado" })
        .getByRole("button", { name: /Entregada/ })
        .click();
      await expect(page.getByRole("region", { name: /^Entregada:/ })).toBeVisible();
      await expect(page.getByRole("region", { name: /^Pendiente:/ })).toBeHidden();

      // El arrastre en celular termina en un TAB, no en otra columna: solo se
      // ve una, así que no hay a dónde soltar. Las otras tres siguen montadas
      // pero en `display: none` —dnd-kit las mide 0×0— y `soloDroppablesVisibles`
      // las descarta, así que un drop no puede caer en una columna invisible.
      await page.getByRole("group", { name: "Filtrar por estado" })
        .getByRole("button", { name: /Pendiente/ })
        .click();
      const tarjeta = page.locator("[data-tarjeta-orden]").first();
      await expect(tarjeta).toBeVisible();

      const tabDestino = page
        .getByRole("group", { name: "Filtrar por estado" })
        .getByRole("button", { name: /En preparación/ });
      const cajaTarjeta = await tarjeta.boundingBox();
      const cajaTab = await tabDestino.boundingBox();

      await page.mouse.move(cajaTarjeta.x + cajaTarjeta.width / 2, cajaTarjeta.y + 16);
      await page.mouse.down();
      await page.mouse.move(cajaTarjeta.x + 60, cajaTarjeta.y + 30, { steps: 5 });
      await page.mouse.move(cajaTab.x + cajaTab.width / 2, cajaTab.y + cajaTab.height / 2, {
        steps: 15,
      });
      await page.mouse.up();

      // Soltar sobre el tab abre el MISMO diálogo que un drop entre columnas.
      //
      // Se acota por nombre: en mobile el drawer del menú también es
      // `role="dialog"` —sigue montado e inerte, ver `AdminSidebar`—, así que un
      // `getByRole("dialog")` pelado rompe por strict mode.
      const dialogoEstado = page.getByRole("dialog", { name: /Cambiar el estado/ });
      await expect(dialogoEstado).toBeVisible();
      await page.getByRole("button", { name: "Cancelar" }).click();
      await expect(dialogoEstado).toHaveCount(0);
    });
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
  test("la cinta de ambiente de testing no tapa la barra superior del admin", async ({ page }) => {
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

  // El nombre dice exactamente lo que el test afirma. Se llamaba "abre con
  // foco atrapado…" y eso prometía algo que acá no se mide: la trampa de foco
  // (tabular en círculo dentro del drawer) vive en `hooks/useDialogo.js` y no
  // es una propiedad del layout, que es de lo que trata este spec.
  test("drawer: Escape lo cierra y devuelve el foco al botón", async ({ page }) => {
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

  test("tabla apilada conserva semántica en /productos", async ({ page }) => {
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

  test("áreas táctiles en /productos: switch y checkbox alcanzan el mínimo recomendado", async ({
    page,
  }) => {
    await page.goto("/catalogo/admin/productos");
    await esperarPantallaLista(page);

    // Discrepancia con el brief: `page.getByRole("switch").first()` SIN
    // acotar a la tabla matchea el toggle de modo oscuro de la barra
    // superior (`ToggleTemaAdmin`, también `role="switch"` y anterior en el
    // DOM al `<table>`), no el toggle "Catálogo" de la primera fila que este
    // test quiere medir — los dos comparten rol pero no layout ni tamaño. Se
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
    // intocable. Acotar a `tbody` es lo que hace que este test mida el área
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
   */
  test("con un diálogo abierto, la barra superior deja de ser alcanzable", async ({ page }) => {
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

    // Cancelar, no confirmar: este test mide layout, no borra nada.
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });
});
