import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearComboDeTest,
  borrarComboDeTest,
  sembrarDispositivoDeTest,
  borrarDispositivoDeTest,
  borrarOrdenDeTest,
  iniciarSesionCliente,
  prisma,
} from "./helpers/db.js";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

// `E2E_CLIENTE_EMAIL` permite correr el recorrido con otra cuenta de cliente
// que ya exista en la base local, sin versionar ese email.
const EMAIL_CLIENTE = process.env.E2E_CLIENTE_EMAIL || "test@test.com";
const NOMBRE_COMBO = "E2E-TEST-Kit Combo Playwright";

/**
 * Combos de punta a punta (spec §12): home -> página del combo -> carrito ->
 * checkout con sesión -> confirmación -> la orden agrupada en "Mis pedidos",
 * y en la base una fila de ItemOrden por producto con el snapshot del combo.
 *
 * Requiere el backend real en el 4000 y `E2E_CLIENTE_PASSWORD` en backend/.env
 * (la contraseña de la cuenta de cliente `E2E_CLIENTE_EMAIL`, por defecto test@test.com).
 */
test.describe("Combos — de la home a Mis pedidos", () => {
  let lampara;
  let mesa;
  let combo;
  let cuenta;
  let dispositivo;
  let ordenId = null;

  test.beforeAll(async () => {
    const password = process.env.E2E_CLIENTE_PASSWORD;
    if (!password) throw new Error("Falta E2E_CLIENTE_PASSWORD en backend/.env (contraseña de test@test.com).");

    cuenta = await prisma.cuentaCliente.findUnique({ where: { email: EMAIL_CLIENTE } });
    if (!cuenta) throw new Error(`No existe la cuenta de prueba ${EMAIL_CLIENTE} en la base local.`);

    lampara = await crearProductoDeTest({ nombre: "E2E-TEST-Lámpara Combo", precio: "10000", stock: 10 });
    mesa = await crearProductoDeTest({ nombre: "E2E-TEST-Mesa Combo", precio: "25000", stock: 10 });
    combo = await crearComboDeTest({
      nombre: NOMBRE_COMBO,
      porcentaje: 15,
      items: [
        { productId: lampara.id, cantidad: 2 },
        { productId: mesa.id, cantidad: 1 },
      ],
    });
    dispositivo = await sembrarDispositivoDeTest(cuenta.id);
  });

  test.afterAll(async () => {
    if (ordenId !== null) await borrarOrdenDeTest(ordenId); // sin clienteId: el Cliente de la cuenta real se queda
    if (combo?.id) await borrarComboDeTest(combo.id);
    if (lampara?.id) await borrarProductoDeTest(lampara.id);
    if (mesa?.id) await borrarProductoDeTest(mesa.id);
    if (dispositivo?.dispositivoId) await borrarDispositivoDeTest(dispositivo.dispositivoId);
  });

  test.beforeEach(async ({ page }) => {
    await neutralizarContextoComercial(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test("agregar desde la home, ver la página, comprar con sesión y ver la orden agrupada", async ({ page }) => {
    await test.step("la home muestra el combo y 'Agregar combo' lo suma al carrito", async () => {
      await page.goto("/");
      const tarjeta = page.locator('[data-seccion-home="combos"] article').filter({ hasText: NOMBRE_COMBO });
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta.getByText("$ 38.250")).toBeVisible(); // (10000*2 + 25000) * 0,85
      await tarjeta.getByRole("button", { name: /Agregar combo/i }).click();
      await tarjeta.getByRole("link", { name: /Ver el combo/i }).click();
    });

    await test.step("la página del combo abre con su ruta y su cuenta", async () => {
      await expect(page).toHaveURL(new RegExp(`/combos/${combo.id}-`));
      await expect(page.getByRole("heading", { level: 1, name: NOMBRE_COMBO })).toBeVisible();
      await expect(page.getByText("Qué incluye")).toBeVisible();
      await expect(page.getByText(`Por separado (3 productos)`)).toBeVisible();
    });

    await test.step("el carrito muestra una sola línea de combo con su total", async () => {
      await page.goto("/carrito");
      const linea = page.getByRole("listitem").filter({ hasText: NOMBRE_COMBO });
      await expect(linea).toBeVisible();
      await expect(linea.getByText("2× E2E-TEST-Lámpara Combo · E2E-TEST-Mesa Combo")).toBeVisible();
      await expect(page.getByTestId("carrito-total")).toHaveText("$ 38.250");
    });

    await test.step("login con test@test.com y confirmar el pedido", async () => {
      await iniciarSesionCliente(page, {
        email: EMAIL_CLIENTE,
        password: process.env.E2E_CLIENTE_PASSWORD,
        tokenDispositivo: dispositivo.tokenDispositivo,
      });
      await page.goto("/checkout");
      await expect(page.getByText(`1 × ${NOMBRE_COMBO}`)).toBeVisible();
      await page.getByRole("button", { name: "Confirmar pedido" }).click();
      await expect(page).toHaveURL(/\/checkout\/confirmacion$/);
      await expect(page.getByText(`1 × ${NOMBRE_COMBO}`)).toBeVisible();
    });

    await test.step("en la base: una fila por producto, con el snapshot del combo y el total del combo", async () => {
      const orden = await prisma.orden.findFirst({
        where: { cuentaClienteId: cuenta.id, items: { some: { comboId: combo.id } } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      expect(orden).not.toBeNull();
      ordenId = orden.id;

      expect(orden.items).toHaveLength(2);
      for (const item of orden.items) {
        expect(item.comboId).toBe(combo.id);
        expect(item.comboNombre).toBe(NOMBRE_COMBO);
        expect(item.comboCantidad).toBe(1);
        expect(item.comboPorcentaje).toBe(15);
      }
      const total = orden.items.reduce((suma, item) => suma + parseFloat(item.precioUnitario.toString()) * item.cantidad, 0);
      expect(total).toBe(38250);
    });

    await test.step("el detalle de Mis pedidos muestra el combo como una sola línea", async () => {
      await page.goto(`/cuenta/pedidos/${ordenId}`);
      await expect(page.getByText(`${NOMBRE_COMBO} × 1 — $ 38.250`)).toBeVisible();
      await expect(page.getByText("2× E2E-TEST-Lámpara Combo · E2E-TEST-Mesa Combo")).toBeVisible();
    });
  });
});
