import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — pasada rápida de accesibilidad sobre el checkout.
 *
 * No es una auditoría completa de accesibilidad — el Sprint 6 ya agregó
 * `aria-describedby`/`aria-invalid`/`role="alert"` a `Checkout.jsx`'s
 * formulario (revisado por code review en ese momento, pero solo con tests
 * unitarios/jsdom). Esto confirma que esas mismas piezas siguen intactas y
 * funcionan bajo render real de browser (Playwright/Chromium), no solo bajo
 * jsdom: los labels están programáticamente asociados a sus inputs
 * (`getByLabel` depende de eso para resolver), y un campo inválido después de
 * un submit fallido efectivamente expone `aria-invalid="true"` +
 * `aria-describedby` apuntando a un elemento con el mensaje de error real.
 */
test.describe("Checkout — accesibilidad básica del formulario", () => {
  let producto;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({ nombre: "E2E-TEST-A11y Checkout", precio: "500.00" });
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("los labels resuelven por accesible name y un submit inválido expone aria-invalid/aria-describedby", async ({
    page,
  }) => {
    await page.goto(`/producto/${producto.id}`);
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);

    // Los 5 campos resuelven por su accessible name (label asociado vía
    // htmlFor/id) — si esto falla, `getByLabel` no encuentra el input.
    for (const label of ["DNI", "Nombre", "Teléfono", "Email", "Notas (opcional)"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }

    // Submit con los 4 campos requeridos vacíos (DNI, Nombre, Teléfono y Email).
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    const dniField = page.getByLabel("DNI");
    await expect(dniField).toHaveAttribute("aria-invalid", "true");
    const describedBy = await dniField.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const mensajeError = page.locator(`#${describedBy}`);
    await expect(mensajeError).toBeVisible();
    await expect(mensajeError).toHaveText("El DNI es obligatorio.");

    // De los otros campos requeridos (Nombre, Teléfono y Email), se verifica que estos dos también queden marcados.
    await expect(page.getByLabel("Nombre")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Teléfono")).toHaveAttribute("aria-invalid", "true");
  });

  test("un error de envío del backend se anuncia con role=alert", async ({ page }) => {
    // Se fuerza un error de envío interceptando la request y devolviendo un
    // 400, sin depender de un escenario real de negocio para llegar a este
    // estado — lo que se está probando acá es la marca de accesibilidad del
    // mensaje de error (`role="alert"` en `errorEnvio`), no una regla de
    // negocio puntual.
    await page.route("**/api/ordenes", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Error de prueba simulado." }),
      });
    });

    await page.goto(`/producto/${producto.id}`);
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await page.goto("/checkout");

    await page.getByLabel("DNI").fill("00123456");
    await page.getByLabel("Nombre").fill("E2E-TEST-A11y Cliente");
    await page.getByLabel("Teléfono").fill("1122334455");
    await page.getByLabel("Email").fill("e2e-a11y@example.com");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveText("Error de prueba simulado.");
  });
});
