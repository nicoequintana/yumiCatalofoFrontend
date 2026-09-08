import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
} from "./helpers/db.js";

/**
 * Guard de no-regresión de escritorio del admin (proyecto `chromium`).
 *
 * El plan de responsive del admin (Tasks 0-4) tocó CSS y markup compartido
 * (`AdminLayout`, `AdminSidebar`, `clasesTabla.js`, `index.css`) para agregar
 * el layout de mobile SIN cambiar el de escritorio. Este spec es la prueba de
 * esa segunda mitad de la promesa: la tabla sigue siendo `display: table`, el
 * drawer sigue inerte cuando no se abrió y la bottom nav sigue en su lugar.
 *
 * ⚠️ HISTORIA DEL CORTE: entre el 07/09/2026 y el 08/09/2026 este spec medía a
 * 1280 y ahí NO había bottom nav. Con diez ítems (los seis de hoy más
 * Analítica y Configuración desplegados en línea) el corte se subió de `lg`
 * (1024px) a `min-[1360px]` porque la barra medía 1326px de ancho intrínseco y
 * no llevaba `flex-wrap` ni scroll: entre 1024 y 1325 lo que sobraba se
 * pintaba fuera del viewport sin generar scroll de documento, y "Cerrar
 * sesión" era inalcanzable con el mouse por debajo de 1134px. El motivo
 * completo está en el comentario del `<nav>` de `AdminSidebar.jsx`.
 *
 * La reorganización del 08/09/2026 (diez ítems → cinco más dos acordeones)
 * sacó la causa, y este spec fue el que lo confirmó: medido con los mismos
 * `scrollWidth`/`elementFromPoint` de siempre a 1025, 1100 y 1280px, la barra
 * entra entera y "Cerrar sesión" recibe el click en su centro en los tres. El
 * corte volvió a `lg`, y el guard de abajo mide contra la bottom nav REAL en
 * vez del drawer de la banda huérfana, que ya no existe.
 */
test.describe("Admin en escritorio (no-regresión)", () => {
  let producto;
  let usuarioAdmin;

  test.beforeAll(async () => {
    producto = await crearProductoDeTest({ nombre: "E2E-TEST-Producto Desktop" });
    usuarioAdmin = await crearUsuarioAdminDeTest();
  });

  test.afterAll(async () => {
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
    if (usuarioAdmin?.id) {
      await borrarUsuarioAdminDeTest(usuarioAdmin.id);
    }
  });

  /**
   * Un solo `test` y un solo login a propósito: el rate limit del login es de
   * 8 intentos cada 15 minutos por IP, y partir esto en tres tests gastaría
   * tres del presupuesto de toda la suite. Los anchos se recorren con
   * `setViewportSize` sobre la misma sesión.
   */
  test("la bottom nav aparece desde 1024px (lg), entra entera y su logout es clickeable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/catalogo/admin/login");
    await page.getByLabel("Email").fill(usuarioAdmin.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

    /**
     * El enlace de salto: la navegación va primera en el DOM (por el contrato
     * de apilamiento de `AdminLayout`), así que sin él la primera tabulación
     * caía en el primer ítem de la nav y el contenido quedaba a trece paradas.
     * Va antes que todo lo demás porque necesita el foco recién cargada la
     * página, sin que ningún click previo lo haya movido.
     */
    await test.step("la primera tabulación salta al contenido", async () => {
      await page.keyboard.press("Tab");

      const salto = page.getByRole("link", { name: "Saltar al contenido" });
      await expect(salto).toBeFocused();
      // `sr-only` hasta que se lo enfoca: recién enfocado ocupa lugar real.
      await expect(salto).toBeVisible();
      const caja = await salto.boundingBox();
      expect(caja.height, "el enlace de salto es un target de 44px").toBeGreaterThanOrEqual(44);

      await page.keyboard.press("Enter");
      const enfocadoTrasElSalto = await page.evaluate(() => document.activeElement?.id);
      expect(enfocadoTrasElSalto).toBe("contenido-admin");
    });

    await test.step("1440px: la forma de escritorio de siempre", async () => {
      const tabla = page.getByRole("table").first();
      await expect(tabla).toBeVisible();
      await expect(tabla).toHaveCSS("display", "table");

      // La barra superior mobile (y su botón de menú) es `lg:hidden`.
      await expect(page.getByRole("button", { name: "Abrir menú" })).toBeHidden();

      // El drawer nunca se abrió en esta corrida: sigue inerte, como en su
      // estado colapsado por defecto.
      //
      // Discrepancia con el brief: a este ancho el `<aside>` del drawer tiene
      // `display: none`, y un elemento así queda AFUERA del árbol de
      // accesibilidad del todo — no es que tenga el rol "oculto", directamente
      // no tiene rol. `page.getByRole("dialog", …)` nunca lo encuentra acá (el
      // locator queda esperando para siempre), así que hace falta un selector
      // de DOM crudo en vez de uno por rol.
      const drawer = page.locator('aside[role="dialog"][aria-label="Menú"]');
      expect(await drawer.evaluate((el) => el.inert)).toBe(true);

      // "Ventas" vive adentro del acordeón "Analítica" (05/09/2026), no como
      // link suelto de primer nivel — "Productos" sí lo es y alcanza para
      // verificar que la bottom nav está en la franja inferior.
      const linkProductos = page.getByRole("link", { name: "Productos" });
      await expect(linkProductos).toBeVisible();
      const caja = await linkProductos.boundingBox();
      expect(
        caja.y,
        "el link Productos de la bottom nav está en la franja inferior",
      ).toBeGreaterThan(680);

      // La barra entra ENTERA: su ancho intrínseco (`scrollWidth`) no puede
      // pasarse de su propio `clientWidth`. Es la medición que faltaba y que
      // dejó el bug pasar — `scrollWidth` SÍ acusa el desborde aunque el
      // elemento sea `fixed` y su `overflow-x` compute `visible` (medido:
      // 2512 de `scrollWidth` contra 1521 de `clientWidth` con la barra vieja
      // desbordada a 1536px de viewport). Comparar contra `clientWidth`, NO
      // contra `innerWidth`: con scrollbar clásico presente `innerWidth` es
      // ~15px mayor que el ancho de layout, y esos 15px de holgura dejarían
      // pasar en verde un desborde real de hasta ese tamaño.
      const nav = page.locator("nav.fixed.inset-x-0.bottom-0");
      const desborde = await nav.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(desborde, "la bottom nav no desborda su propio ancho a 1440px").toBeLessThanOrEqual(0);
    });

    /**
     * La medición que decidió el corte (08/09/2026): con la nav reorganizada
     * en cinco ítems más dos acordeones, ¿entra la bottom nav a los anchos
     * donde antes (con diez ítems) se pintaba fuera del viewport? Los tres
     * anchos son los mismos que delataron el bug original — 1280 es el
     * extremo superior de la banda rota, 1100 es un punto intermedio — y las
     * dos afirmaciones son las que importan: `scrollWidth` no se pasa de
     * `clientWidth` (nada se pinta fuera de la propia barra) y
     * `elementFromPoint` en el centro de "Cerrar sesión" devuelve el botón de
     * verdad (visible no es lo mismo que alcanzable: eso fue justo lo que
     * ocultó el bug anterior).
     *
     * ⚠️ 1025, no 1024: `lg` (`min-width: 1024px`) evalúa contra el ancho de
     * LAYOUT, que con scrollbar clásico presente es ~15px menor que
     * `window.innerWidth` (1009 contra 1024 medido). A exactamente 1024px de
     * viewport la media query puede no dispararse y la bottom nav no
     * encenderse — Playwright headless oculta los scrollbars, así que ese
     * paso pasaba en esta suite sin que existiera ningún bug, pero fallaría
     * en `--headed` o en un navegador real con scrollbar visible: una trampa
     * para el próximo que lo corra así. A 1024px exacto, en un navegador con
     * scrollbar, el drawer sigue atendiendo — funciona, no es una regresión.
     */
    for (const ancho of [1025, 1100, 1280]) {
      await test.step(`${ancho}px: la bottom nav entra entera y su logout es clickeable`, async () => {
        await page.setViewportSize({ width: ancho, height: 800 });

        const nav = page.locator("nav.fixed.inset-x-0.bottom-0");
        await expect(nav, `a ${ancho}px la bottom nav está visible`).toBeVisible();

        // Comparar contra `clientWidth`, NO contra `innerWidth`: con
        // scrollbar clásico presente `innerWidth` mete ~15px de holgura que
        // dejarían pasar en verde un desborde real de hasta ese tamaño.
        const { scrollWidth, clientWidth } = await page.evaluate(() => {
          const n = document.querySelector("nav.fixed.inset-x-0.bottom-0");
          return { scrollWidth: n.scrollWidth, clientWidth: n.clientWidth };
        });
        expect(
          scrollWidth - clientWidth,
          `a ${ancho}px la bottom nav entra entera (scrollWidth ${scrollWidth} <= clientWidth ${clientWidth})`,
        ).toBeLessThanOrEqual(0);

        const logout = nav.getByRole("button", { name: "Cerrar sesión" });
        await expect(logout, `a ${ancho}px "Cerrar sesión" se ve`).toBeVisible();

        const caja = await logout.boundingBox();
        expect(caja.height, `a ${ancho}px el logout mide 44px o más`).toBeGreaterThanOrEqual(44);

        // Visible no es alcanzable: lo que decide si el click llega es qué
        // devuelve `elementFromPoint` en el centro del control. Es la
        // medición que delató el bug original (a 1024, con diez ítems, el
        // logout de la bottom nav no lo devolvía: estaba pintado fuera de
        // pantalla pese a "verse" para Playwright).
        const recibeElClick = await page.evaluate(
          ({ x, y }) => {
            const boton = document.elementFromPoint(x, y)?.closest("button");
            return boton ? boton.textContent.includes("Cerrar sesión") : false;
          },
          { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 },
        );
        expect(recibeElClick, `a ${ancho}px el logout recibe el click en su centro`).toBe(true);
      });
    }

    /**
     * Por debajo de `lg` el drawer es la navegación, con su propio logout —
     * mismo mecanismo de siempre (`useDialogo` + `useBloquearScroll`), que
     * `admin-mobile.spec.js` ya cubre a 412px. Acá alcanza con un ancho justo
     * debajo del corte para confirmar que el drawer sigue siendo la salida
     * ahí, ya sin la banda huérfana que existía con el corte en 1360.
     */
    await test.step("1023px: por debajo de lg, el drawer atiende con su logout alcanzable", async () => {
      await page.setViewportSize({ width: 1023, height: 800 });

      const botonMenu = page.getByRole("button", { name: "Abrir menú" });
      await expect(botonMenu, "a 1023px hay con qué abrir la navegación").toBeVisible();
      await botonMenu.click();

      const drawer = page.getByRole("dialog", { name: "Menú" });
      await expect(drawer).toBeVisible();

      const logout = drawer.getByRole("button", { name: "Cerrar sesión" });
      await expect(logout, "a 1023px \"Cerrar sesión\" se ve").toBeVisible();

      const caja = await logout.boundingBox();
      expect(caja.height, "a 1023px el logout mide 44px o más").toBeGreaterThanOrEqual(44);

      const recibeElClick = await page.evaluate(
        ({ x, y }) => {
          const boton = document.elementFromPoint(x, y)?.closest("button");
          return boton ? boton.textContent.includes("Cerrar sesión") : false;
        },
        { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 },
      );
      expect(recibeElClick, "a 1023px el logout recibe el click en su centro").toBe(true);

      // Escape lo cierra, pero NO con `toBeHidden()`: el drawer se cierra
      // deslizándose (`-translate-x-full`), así que conserva su caja y para
      // Playwright sigue siendo "visible". Lo que prueba de verdad que quedó
      // cerrado es `inert`: saca el subárbol del foco, del click y del árbol
      // de accesibilidad. Es lo mismo que el resto del repo verifica cuando
      // jsdom no alcanza.
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveAttribute("inert", "");
      await expect(drawer).toHaveClass(/-translate-x-full/);
    });
  });
});
