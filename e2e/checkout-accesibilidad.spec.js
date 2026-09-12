import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearCuentaClienteDeTest,
  borrarCuentaClienteDeTest,
  iniciarSesionCliente,
} from "./helpers/db.js";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

/**
 * Checkout AUTENTICADO — accesibilidad básica del formulario (reescrito,
 * Parte 5).
 *
 * ⚠️ **Se aparta del plan original de la Parte 5 a propósito — seguir al
 * código, no al plan.** El plan (08/09) asumía que el formulario
 * autenticado seguía validando DNI/Nombre/Teléfono al submit
 * (`aria-invalid`/`aria-describedby`/"El DNI es obligatorio.") con una
 * cuenta creada a propósito con `dni: ""`. Eso ya no es así en
 * `Checkout.jsx` (commit `cc9b548` y posteriores): los tres campos se
 * MUESTRAN de la cuenta como texto plano y solo se vuelven inputs editables
 * detrás de un botón "Editar" — no hay ninguna validación de campo
 * requerido en ese panel, y el submit no la dispara. Además, una cuenta con
 * `dni: ""` nunca llegaría a `/checkout`: `RequireAuthCliente` la manda a
 * `/cuenta/completar` por perfil incompleto ANTES de que el checkout monte.
 * Ese mecanismo de accesibilidad de campo requerido simplemente no existe
 * más en esta pantalla — un spec que lo afirmara probaría un camino muerto.
 *
 * Lo que SÍ sigue siendo cierto y vale la pena confirmar bajo render real de
 * browser (no solo jsdom):
 *   1. Los labels que quedan resuelven por accesible name (`Notas`, y los
 *      tres del panel de edición cuando se abre).
 *   2. Un error de envío del backend se anuncia con `role="alert"` — esto
 *      no cambió, sigue viviendo en `Checkout.jsx`.
 */
test.describe("Checkout autenticado — accesibilidad básica del formulario", () => {
  test.beforeEach(async ({ page }) => {
    await neutralizarContextoComercial(page);
  });

  let producto;
  let cuentaInfo;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({ nombre: "E2E-TEST-A11y Checkout", precio: "500" });
    // Cuenta con perfil COMPLETO a propósito (nombre/telefono/dni default):
    // con cualquiera de los tres vacío, RequireAuthCliente redirige a
    // /cuenta/completar y este spec nunca vería el checkout.
    cuentaInfo = await crearCuentaClienteDeTest();
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    await borrarCuentaClienteDeTest(cuentaInfo.cuenta.id);
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("los labels resuelven por accesible name (sin Email) y el panel de edición expone Nombre/Teléfono/DNI", async ({
    page,
  }) => {
    await page.goto(`/producto/${producto.id}`);
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await page.goto("/checkout");

    await iniciarSesionCliente(page, {
      email: cuentaInfo.cuenta.email,
      password: cuentaInfo.password,
      tokenDispositivo: cuentaInfo.tokenDispositivo,
    });
    // El helper vuelve a /cuenta/entrar sin `volverA` y cae en /cuenta: hace
    // falta una segunda navegación explícita para llegar al checkout.
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);

    // Email YA NO es un campo del formulario: lo muestra de la cuenta.
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByText(cuentaInfo.cuenta.email)).toBeVisible();

    // "Notas (opcional)" resuelve por su label asociado, tal cual antes.
    await expect(page.getByLabel("Notas (opcional)")).toBeVisible();

    // El panel de edición se abre con "Editar" y expone Nombre/Teléfono/DNI,
    // cada uno con su label programáticamente asociado (htmlFor/id) — si
    // esto falla, `getByLabel` no encuentra el input bajo render real de
    // browser.
    await page.getByRole("button", { name: "Editar" }).click();
    for (const label of ["Nombre", "Teléfono", "DNI"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
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

    await iniciarSesionCliente(page, {
      email: cuentaInfo.cuenta.email,
      password: cuentaInfo.password,
      tokenDispositivo: cuentaInfo.tokenDispositivo,
    });
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);

    // Los tres datos de contacto ya están completos en la cuenta: no hace
    // falta abrir "Editar" ni tipear nada para poder confirmar.
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toBeVisible();

    // El titular es copy humano y dice explícitamente que NO se generó el
    // pedido; el mensaje del backend sobrevive como detalle secundario.
    await expect(alerta).toContainText("no se generó ningún pedido");
    await expect(alerta).toContainText("Revisá tu conexión e intentá de nuevo.");
    await expect(alerta).toContainText("Error de prueba simulado.");
  });
});
