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
   * Hace falta para las DIEZ rutas por igual: varias (el detalle de orden, el
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
    const rutas = [
      "/catalogo/admin/productos",
      "/catalogo/admin/ordenes",
      `/catalogo/admin/ordenes/${orden.id}`,
      "/catalogo/admin/productos/precios",
      "/catalogo/admin/logs",
      "/catalogo/admin/configuracion/categorias",
      "/catalogo/admin/configuracion/usuarios",
      "/catalogo/admin/configuracion/anuncios",
      "/catalogo/admin/ventas",
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
  });

  test("drawer: abre con foco atrapado, Escape cierra y devuelve el foco", async ({ page }) => {
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

    // `.first()` resuelve al checkbox "Seleccionar todos" del encabezado (va
    // antes que `<tbody>` en el DOM y también matchea el regex) y no a uno de
    // fila — es igual de válido para esta medición: el encabezado envuelve su
    // checkbox en el mismo `<label className="-m-3 inline-flex p-3">` que
    // cada fila, así que mide la misma área táctil.
    const checkbox = tabla.getByRole("checkbox", { name: /seleccionar/i }).first();
    const etiqueta = checkbox.locator("xpath=ancestor::label[1]");
    const cajaEtiqueta = await etiqueta.boundingBox();
    expect(cajaEtiqueta.width, "ancho del área táctil del checkbox").toBeGreaterThanOrEqual(44);
    expect(cajaEtiqueta.height, "alto del área táctil del checkbox").toBeGreaterThanOrEqual(44);
  });
});
