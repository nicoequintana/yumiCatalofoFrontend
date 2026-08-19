import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest, borrarOrdenDeTest, crearOrdenDeTest, crearDniDeTest, prisma } from "./helpers/db.js";

const NOMBRE_CLIENTE_TEST = "E2E-TEST-Cliente Recurrente";

/**
 * Sprint 7, Task 2 — Escenario 2: cliente recurrente.
 *
 * Dos órdenes con el MISMO dni deben resolver al MISMO `Cliente` (sin fila
 * duplicada) y quedar ambas asociadas a él. La primera orden se siembra
 * directo vía Prisma (`crearOrdenDeTest`, rápido, no ejercita UI) — ya existe
 * un cliente con historial ANTES de que arranque el test. La segunda orden sí
 * se dirige por un checkout real de UI con el MISMO dni, para ejercitar el
 * camino real de `upsertClienteConReintento` (backend, `ordenes.controller.js`):
 * la rama de UPDATE sobre un cliente ya existente, no la de CREATE.
 *
 * Alcance decidido para este escenario: la verificación es a nivel DB
 * (Prisma) — no se agrega una aserción extra sobre `AdminOrdenes.jsx`
 * filtrado por `?dni=` porque esa UI de filtrado ya tiene cobertura propia en
 * los tests Vitest del Sprint 6 (`AdminOrdenes.test.jsx`); repetirla acá solo
 * infla el tiempo de corrida sin agregar una garantía E2E nueva — lo que
 * ESTE escenario necesita probar de punta a punta es la regla de negocio del
 * upsert-por-dni, que vive en el backend y no en esa pantalla.
 */
test.describe("Cliente recurrente — dos órdenes, mismo dni, un solo Cliente", () => {
  let producto;
  let dniTest;
  let clienteSembradoId;
  let ordenSembradaId;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Cliente Recurrente",
      precio: "1800.00",
    });
    dniTest = crearDniDeTest();

    // Primera orden: sembrada directo vía Prisma, con el cliente ya
    // existente ANTES de que el test dispare el checkout de UI.
    const ordenSembrada = await crearOrdenDeTest({
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
    // `crearOrdenDeTest` generó su propio cliente porque no se pasó
    // `clienteId` — se lo actualiza acá para usar EL MISMO dni de test que
    // el checkout de UI va a reusar más abajo (si no, serían dos clientes
    // distintos y el escenario no probaría nada).
    await prisma.cliente.update({
      where: { id: ordenSembrada.clienteId },
      data: { dni: dniTest, nombre: NOMBRE_CLIENTE_TEST },
    });
    clienteSembradoId = ordenSembrada.clienteId;
    ordenSembradaId = ordenSembrada.id;

    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    const clienteEnDb = await prisma.cliente.findUnique({ where: { dni: dniTest } }).catch(() => null);
    if (clienteEnDb) {
      const ordenesDelCliente = await prisma.orden.findMany({ where: { clienteId: clienteEnDb.id } });
      for (const orden of ordenesDelCliente) {
        await borrarOrdenDeTest(orden.id, clienteEnDb.id);
      }
    } else if (clienteSembradoId) {
      // Fallback si el update de dni de arriba falló a mitad de camino.
      await borrarOrdenDeTest(ordenSembradaId, clienteSembradoId).catch(() => {});
    }

    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("segunda orden con el mismo dni actualiza el Cliente existente, sin duplicarlo", async ({ page }) => {
    // Precondición: efectivamente hay 1 cliente y 1 orden antes de tocar la UI.
    const clientesAntes = await prisma.cliente.findMany({ where: { dni: dniTest } });
    expect(clientesAntes).toHaveLength(1);
    const ordenesAntes = await prisma.orden.findMany({ where: { clienteId: clientesAntes[0].id } });
    expect(ordenesAntes).toHaveLength(1);

    // Checkout real de UI con el mismo dni, pero datos de contacto NUEVOS —
    // así la aserción final puede distinguir "quedó el dato viejo" (bug: creó
    // un cliente nuevo o no actualizó) de "quedó el dato nuevo" (correcto:
    // pasó por la rama de update de upsertClienteConReintento).
    await page.goto("/coleccion");
    await page.getByPlaceholder(/buscar/i).fill("E2E-TEST-Producto Cliente Recurrente");
    await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

    const linkProducto = page.getByRole("link", { name: /E2E-TEST-Producto Cliente Recurrente/i });
    await expect(linkProducto).toBeVisible();
    await linkProducto.click();

    await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}$`));
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await expect(page.getByRole("button", { name: /agregado/i })).toBeVisible();

    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel("DNI").fill(dniTest);
    await page.getByLabel("Nombre").fill(NOMBRE_CLIENTE_TEST);
    await page.getByLabel("Teléfono").fill("1155667788"); // teléfono NUEVO, distinto del seed inicial

    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmacion$/);

    // Verificación final: un solo Cliente para ese dni, con el teléfono
    // actualizado, y 2 Orden asociadas (la sembrada + la de UI).
    const clientesDespues = await prisma.cliente.findMany({ where: { dni: dniTest } });
    expect(clientesDespues).toHaveLength(1);
    expect(clientesDespues[0].telefono).toBe("1155667788");

    const ordenesDespues = await prisma.orden.findMany({
      where: { clienteId: clientesDespues[0].id },
      orderBy: { createdAt: "asc" },
    });
    expect(ordenesDespues).toHaveLength(2);
    expect(ordenesDespues[0].id).toBe(ordenSembradaId);
  });
});
