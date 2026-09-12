import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  borrarOrdenDeTest,
  crearCuentaClienteDeTest,
  borrarCuentaClienteDeTest,
  iniciarSesionCliente,
  prisma,
} from "./helpers/db.js";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

const NOMBRE_CLIENTE_TEST = "E2E-TEST-Cliente Recurrente Cuenta";

/**
 * Cliente recurrente CON CUENTA (reescrito, Parte 5): dos compras con la
 * MISMA cuenta autenticada.
 *
 * A diferencia de la versión de invitado que este spec probaba antes (el
 * upsert por dni de un comprador sin cuenta — ya no existe: `/checkout` es
 * inalcanzable sin sesión), acá lo que se prueba es que el contacto de una
 * orden con cuenta se resuelve desde `CuentaCliente`: el checkout
 * autenticado prellena esos datos en la segunda compra, y el `Cliente`
 * comercial que `upsertClienteConReintento` sigue escribiendo por detrás es
 * el MISMO en las dos órdenes (mismo dni).
 */
test.describe("Cliente recurrente — segunda compra con la misma cuenta", () => {
  test.beforeEach(async ({ page }) => {
    await neutralizarContextoComercial(page);
  });

  let producto;
  let cuentaInfo;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Cliente Recurrente",
      precio: "1800",
    });
    cuentaInfo = await crearCuentaClienteDeTest({
      nombre: NOMBRE_CLIENTE_TEST,
      telefono: "1155667788",
    });

    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    const ordenes = await prisma.orden.findMany({ where: { cuentaClienteId: cuentaInfo.cuenta.id } });
    for (const orden of ordenes) {
      await borrarOrdenDeTest(orden.id, orden.clienteId ?? undefined);
    }
    await borrarCuentaClienteDeTest(cuentaInfo.cuenta.id);
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("dos compras seguidas con la misma cuenta: datos prellenados en la segunda, y el mismo Cliente comercial", async ({
    page,
  }) => {
    await test.step("primera compra: sin sesión todavía, hace login antes de llegar al formulario", async () => {
      await page.goto(`/producto/${producto.id}`);
      await page.getByRole("button", { name: /agregar al carrito/i }).click();
      await page.goto("/checkout");
      await expect(page).toHaveURL(`/cuenta/entrar?volverA=${encodeURIComponent("/checkout")}`);

      await iniciarSesionCliente(page, {
        email: cuentaInfo.cuenta.email,
        password: cuentaInfo.password,
        tokenDispositivo: cuentaInfo.tokenDispositivo,
      });
      // El helper navega de entrada a `/cuenta/entrar` sin el `volverA` que
      // el guard había puesto, así que el login cae en `/cuenta` (default de
      // Entrar.jsx) y no de vuelta en el checkout — se vuelve a navegar.
      await page.goto("/checkout");
      await expect(page).toHaveURL(/\/checkout$/);

      await page.getByRole("button", { name: "Confirmar pedido" }).click();
      await expect(page).toHaveURL(/\/checkout\/confirmacion$/);
    });

    await test.step("segunda compra: sigue logueado, el checkout llega con los datos de la cuenta ya prellenados", async () => {
      await page.goto(`/producto/${producto.id}`);
      await page.getByRole("button", { name: /agregar al carrito/i }).click();
      await page.goto("/checkout");

      // Sigue logueado (`sesion_cliente` sobrevive a la navegación): no
      // vuelve a pasar por /cuenta/entrar esta vez.
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByText(NOMBRE_CLIENTE_TEST)).toBeVisible();
      await expect(page.getByText("1155667788")).toBeVisible();

      await page.getByRole("button", { name: "Confirmar pedido" }).click();
      await expect(page).toHaveURL(/\/checkout\/confirmacion$/);
    });

    await test.step("verificación en DB: dos órdenes, mismo cuentaClienteId, y un único Cliente comercial", async () => {
      const ordenes = await prisma.orden.findMany({
        where: { cuentaClienteId: cuentaInfo.cuenta.id },
        orderBy: { createdAt: "asc" },
      });
      expect(ordenes).toHaveLength(2);
      expect(ordenes[0].clienteId).toBe(ordenes[1].clienteId);

      const clientesConEseDni = await prisma.cliente.findMany({ where: { dni: cuentaInfo.cuenta.dni } });
      expect(clientesConEseDni).toHaveLength(1);
    });
  });
});
