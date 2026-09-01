import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
} from "./helpers/db.js";

/**
 * Guard de no-regresión de escritorio del admin (proyecto `chromium`,
 * 1280x720 — el mismo viewport que el resto de la suite).
 *
 * El plan de responsive del admin (Tasks 0-4) tocó CSS y markup compartido
 * (`AdminLayout`, `AdminSidebar`, `clasesTabla.js`, `index.css`) para agregar
 * el layout de mobile SIN cambiar el de escritorio. Este spec es la prueba
 * de esa segunda mitad de la promesa: confirma que a 1280px la tabla sigue
 * siendo `display: table`, el botón de menú mobile sigue oculto, el drawer
 * sigue inerte y la bottom nav sigue en su lugar de siempre.
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

  test("la tabla, el botón de menú y la bottom nav conservan su forma de escritorio", async ({
    page,
  }) => {
    await page.goto("/catalogo/admin/login");
    await page.getByLabel("Email").fill(usuarioAdmin.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

    const tabla = page.getByRole("table").first();
    await expect(tabla).toBeVisible();
    await expect(tabla).toHaveCSS("display", "table");

    // La barra superior mobile (y su botón de menú) es `lg:hidden`.
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeHidden();

    // El drawer nunca se abrió en esta corrida: sigue inerte, como en su
    // estado colapsado por defecto.
    //
    // Discrepancia con el brief: en escritorio el `<aside>` del drawer es
    // `lg:hidden` (`display: none`), y un elemento con `display: none` queda
    // AFUERA del árbol de accesibilidad del todo — no es que tenga el rol
    // "oculto", directamente no tiene rol. `page.getByRole("dialog", …)`
    // nunca lo encuentra a este ancho (el locator queda esperando para
    // siempre), así que acá hace falta un selector de DOM crudo en vez de uno
    // por rol — el mismo elemento, la misma verificación de `inert`.
    const drawer = page.locator('aside[role="dialog"][aria-label="Menú"]');
    expect(await drawer.evaluate((el) => el.inert)).toBe(true);

    // La bottom nav (`lg:flex`) está siempre visible en escritorio, pegada
    // abajo — su link "Ventas" tiene que caer en la franja inferior de un
    // viewport de 720px de alto.
    const linkVentas = page.getByRole("link", { name: "Ventas" });
    await expect(linkVentas).toBeVisible();
    const caja = await linkVentas.boundingBox();
    expect(caja.y, "el link Ventas de la bottom nav está en la franja inferior").toBeGreaterThan(600);
  });
});
