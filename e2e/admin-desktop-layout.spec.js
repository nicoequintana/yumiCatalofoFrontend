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
 * ⚠️ ESTE SPEC MEDÍA A 1280 Y AHÍ YA NO HAY BOTTOM NAV. El corte pasó de `lg`
 * (1024px) a 1360px porque la barra mide 1326px de ancho intrínseco y no lleva
 * `flex-wrap` ni scroll: entre 1024 y 1325 lo que sobraba se pintaba fuera del
 * viewport sin generar scroll de documento, y "Cerrar sesión" era inalcanzable
 * con el mouse por debajo de 1134px. El motivo completo está en el comentario
 * del `<nav>` de `AdminSidebar.jsx`. Por eso hay dos mediciones acá: la barra
 * a 1440, y el drawer —con su logout— en los tres anchos de la banda que antes
 * quedaba huérfana.
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
  test("la bottom nav a 1360+, el drawer con su logout alcanzable por debajo", async ({ page }) => {
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

      // La barra superior mobile (y su botón de menú) es `min-[1360px]:hidden`.
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

      const linkVentas = page.getByRole("link", { name: "Ventas" });
      await expect(linkVentas).toBeVisible();
      const caja = await linkVentas.boundingBox();
      expect(caja.y, "el link Ventas de la bottom nav está en la franja inferior").toBeGreaterThan(
        680,
      );

      // La barra entra ENTERA: su ancho intrínseco (`scrollWidth`) no puede
      // pasarse del viewport. Es la medición que faltaba y que dejó el bug
      // pasar — el `clientWidth` de un elemento `fixed` es siempre el del
      // viewport, así que compararlos entre sí nunca falla.
      const nav = page.locator("nav.fixed.inset-x-0.bottom-0");
      const desborde = await nav.evaluate((el) => el.scrollWidth - window.innerWidth);
      expect(desborde, "la bottom nav no desborda el viewport a 1440px").toBeLessThanOrEqual(0);
    });

    // La banda que antes quedaba sin salida: la bottom nav ya estaba encendida
    // (`lg:flex`) pero recortada, y el drawer —que es quien tiene el otro
    // logout— ya estaba apagado. Los tres anchos incluyen 1280, el viewport
    // por defecto del proyecto `chromium`.
    for (const ancho of [1024, 1280, 1359]) {
      await test.step(`${ancho}px: el drawer atiende y su logout es clickeable`, async () => {
        await page.setViewportSize({ width: ancho, height: 800 });

        const botonMenu = page.getByRole("button", { name: "Abrir menú" });
        await expect(botonMenu, `a ${ancho}px hay con qué abrir la navegación`).toBeVisible();
        await botonMenu.click();

        const drawer = page.getByRole("dialog", { name: "Menú" });
        await expect(drawer).toBeVisible();

        const logout = drawer.getByRole("button", { name: "Cerrar sesión" });
        await expect(logout, `a ${ancho}px "Cerrar sesión" se ve`).toBeVisible();

        const caja = await logout.boundingBox();
        expect(caja.height, `a ${ancho}px el logout mide 44px o más`).toBeGreaterThanOrEqual(44);

        // Visible no es alcanzable: lo que decide si el click llega es qué
        // devuelve `elementFromPoint` en el centro del control. Es la medición
        // que delató el bug original (a 1024 el logout de la bottom nav no lo
        // devolvía: estaba pintado fuera de pantalla).
        const recibeElClick = await page.evaluate(
          ({ x, y }) => {
            const boton = document.elementFromPoint(x, y)?.closest("button");
            return boton ? boton.textContent.includes("Cerrar sesión") : false;
          },
          { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 },
        );
        expect(recibeElClick, `a ${ancho}px el logout recibe el click en su centro`).toBe(true);

        // Escape lo cierra, pero NO con `toBeHidden()`: el drawer se cierra
        // deslizándose (`-translate-x-full`), así que conserva su caja y para
        // Playwright sigue siendo "visible". Antes del 07/09/2026 esa
        // aserción pasaba por otro motivo —abajo de `lg` el drawer ni se
        // montaba—, así que medía la ausencia del nodo, no el cierre.
        //
        // Lo que prueba de verdad que quedó cerrado es `inert`: saca el
        // subárbol del foco, del click y del árbol de accesibilidad. Es lo
        // mismo que el resto del repo verifica cuando jsdom no alcanza.
        await page.keyboard.press("Escape");
        await expect(drawer).toHaveAttribute("inert", "");
        await expect(drawer).toHaveClass(/-translate-x-full/);
      });
    }
  });
});
