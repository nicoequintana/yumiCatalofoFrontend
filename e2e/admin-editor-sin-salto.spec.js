import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearComboDeTest,
  borrarComboDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
} from "./helpers/db.js";

/**
 * Guard de no-regresión: enfocar un control `sr-only` posicionado
 * absolutamente dentro de una columna con scroll propio del editor de admin
 * (`lg:overflow-y-auto`) NO puede mover `window.scrollY`.
 *
 * Ver la investigación completa en
 * `.superpowers/sdd/combos-rediseno/debug-hero-report.md`. Resumen: la
 * columna de formulario de `AdminComboForm.jsx` (y el `<aside>` de preview)
 * no eran elementos posicionados, así que sus descendientes `sr-only`
 * `position: absolute` (el input de archivo de "Subir imagen" y los radios
 * de Vigencia) tomaban `<main id="contenido-admin" class="relative">`
 * (`AdminLayout.jsx`) como containing block en vez de su propia columna.
 * Eso estiraba el scroll del DOCUMENTO mucho más allá del viewport, y el
 * foco nativo del navegador (al clickear "Subir imagen" o una tarjeta de
 * Vigencia) scrolleaba la página entera ~628px, mostrando el `body` blanco
 * debajo del admin oscuro.
 *
 * `--alto-cinta-ambiente` (24px, sólo en dev) es el único margen tolerado:
 * en producción vale 0.
 */
const ALTO_CINTA_AMBIENTE_DEV = 24;

test.describe("Editor de admin — enfocar un control no scrollea la página", () => {
  let usuarioAdmin;
  let productoUno;
  let productoDos;
  let combo;

  test.beforeAll(async () => {
    usuarioAdmin = await crearUsuarioAdminDeTest();
    productoUno = await crearProductoDeTest({ nombre: "E2E-TEST-Salto Uno" });
    productoDos = await crearProductoDeTest({ nombre: "E2E-TEST-Salto Dos" });
    combo = await crearComboDeTest({
      nombre: "E2E-TEST-Combo Sin Salto",
      items: [
        { productId: productoUno.id, cantidad: 1 },
        { productId: productoDos.id, cantidad: 1 },
      ],
    });
  });

  test.afterAll(async () => {
    if (combo?.id) await borrarComboDeTest(combo.id);
    if (productoUno?.id) await borrarProductoDeTest(productoUno.id);
    if (productoDos?.id) await borrarProductoDeTest(productoDos.id);
    if (usuarioAdmin?.id) await borrarUsuarioAdminDeTest(usuarioAdmin.id);
  });

  /**
   * UN SOLO login (rate limit 8/15min): todo el recorrido va en un test con
   * `test.step`, mismo criterio que `admin-desktop-layout.spec.js`.
   */
  test("enfocar el input de imagen y un radio de Vigencia no mueve el scroll del documento", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 970 });
    await page.goto("/catalogo/admin/login");
    await page.getByLabel("Email").fill(usuarioAdmin.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

    await test.step("editor de combo: foco en el input de hero y en un radio de Vigencia", async () => {
      await page.goto(`/catalogo/admin/combos/${combo.id}`);
      await expect(page.getByRole("heading", { level: 1, name: "Editar combo" })).toBeVisible();

      const scrollYAntes = await page.evaluate(() => window.scrollY);
      expect(scrollYAntes, "arranca en el tope").toBe(0);

      const inputHero = page.getByLabel("Archivo de la imagen principal");
      await inputHero.focus();
      const scrollYTrasHero = await page.evaluate(() => window.scrollY);
      expect(scrollYTrasHero, "enfocar el input de hero no scrollea el documento").toBe(0);

      const radioVigencia = page.locator('input[name="combo-vigencia"]').first();
      await radioVigencia.focus();
      const scrollYTrasVigencia = await page.evaluate(() => window.scrollY);
      expect(scrollYTrasVigencia, "enfocar un radio de Vigencia no scrollea el documento").toBe(0);

      const { scrollHeight, innerHeight } = await page.evaluate(() => ({
        scrollHeight: document.scrollingElement.scrollHeight,
        innerHeight: window.innerHeight,
      }));
      expect(
        scrollHeight - innerHeight,
        "el documento no crece más allá del viewport (± la cinta de ambiente de dev)",
      ).toBeLessThanOrEqual(ALTO_CINTA_AMBIENTE_DEV);
    });

    await test.step("guard: el editor de producto no tiene la misma fuga (control equivalente en su columna de formulario)", async () => {
      await page.goto(`/catalogo/admin/productos/${productoUno.id}/editar`);
      await expect(page.getByRole("heading", { level: 1, name: /Editar producto/i })).toBeVisible();

      const scrollYAntes = await page.evaluate(() => window.scrollY);
      expect(scrollYAntes, "arranca en el tope").toBe(0);

      // Control equivalente en la misma columna con scroll propio
      // (`lg:overflow-y-auto`, `SeccionesFormulario` → `SolapaImagenes` →
      // `SeccionGenerarImagenes`): el input de "Imágenes de referencia".
      const inputReferencias = page.locator("#referencias-n8n");
      await inputReferencias.focus();
      const scrollYTrasReferencias = await page.evaluate(() => window.scrollY);
      expect(scrollYTrasReferencias, "enfocar el input de referencias no scrollea el documento").toBe(0);

      const { scrollHeight, innerHeight } = await page.evaluate(() => ({
        scrollHeight: document.scrollingElement.scrollHeight,
        innerHeight: window.innerHeight,
      }));
      expect(
        scrollHeight - innerHeight,
        "el documento no crece más allá del viewport (± la cinta de ambiente de dev)",
      ).toBeLessThanOrEqual(ALTO_CINTA_AMBIENTE_DEV);
    });
  });
});
