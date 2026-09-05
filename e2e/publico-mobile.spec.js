import { expect, test } from "@playwright/test";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

/**
 * La navegación del catálogo público en celular.
 *
 * Corre en el proyecto `mobile` (Pixel 7, 412×915). Es el único spec público
 * en viewport chico: la isla y la hoja son las dos piezas cuyo comportamiento
 * depende del tamaño de pantalla, y jsdom no aplica `@media`.
 */
test.beforeEach(async ({ page }) => {
  // El cartel de campaña es `fixed inset-0` e intercepta el primer click.
  await neutralizarContextoComercial(page);
});

test("la isla flotante está al alcance del pulgar y abre el menú", async ({ page }) => {
  await page.goto("/");

  const isla = page.getByTestId("isla-flotante");
  await expect(isla).toBeVisible();

  // Está en la mitad de abajo de la pantalla: es la razón de ser de la pieza.
  const caja = await isla.boundingBox();
  const alto = page.viewportSize().height;
  expect(caja.y).toBeGreaterThan(alto / 2);

  const boton = page.getByRole("button", { name: "Abrir menú" });
  await boton.click();

  const hoja = page.getByRole("dialog", { name: "Menú" });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("link", { name: /todos los productos/i })).toBeVisible();
});

test("cerrar la hoja devuelve el foco al botón que la abrió", async ({ page }) => {
  await page.goto("/");

  const boton = page.getByRole("button", { name: "Abrir menú" });
  await boton.click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog", { name: "Menú" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
});

test("la isla no tapa el final del catálogo", async ({ page }) => {
  await page.goto("/coleccion");

  // El zócalo del Layout tiene que dejar el footer alcanzable por scroll sin
  // que la isla se le monte encima.
  await page.mouse.wheel(0, 20000);
  const footer = page.locator("footer");
  await expect(footer).toBeVisible();

  const cajaFooter = await footer.boundingBox();
  const cajaIsla = await page.getByTestId("isla-flotante").boundingBox();
  // El footer tiene que terminar ANTES de donde empieza la isla (o justo
  // donde empieza): la aserción vieja pedía lo contrario del comentario de
  // arriba y afirmaba el solapamiento en vez de descartarlo.
  expect(cajaFooter.y + cajaFooter.height).toBeLessThanOrEqual(cajaIsla.y);
});
