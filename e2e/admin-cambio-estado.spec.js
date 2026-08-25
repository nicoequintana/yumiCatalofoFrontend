import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  borrarOrdenDeTest,
  crearOrdenDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
  prisma,
} from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 5: admin cambia el estado de una orden y el
 * cambio persiste tras recargar.
 *
 * Login real por UI (form submit contra `/api/auth/login`, JWT real
 * guardado por `setToken`), no inyectado directo en localStorage — de
 * los 5 escenarios de este sprint, este es el único que ejercita el login,
 * así que vale la pena que sea el flujo real de punta a punta (username +
 * password -> JWT -> requests autenticados) en vez de un atajo. El usuario
 * admin se siembra vía `crearUsuarioAdminDeTest` (bcrypt real, mismo patrón
 * que `create-admin.js`) y se borra al final.
 *
 * La orden a gestionar se siembra vía `crearOrdenDeTest` (Prisma directo) —
 * lo que se está probando acá es el cambio de estado + persistencia, no el
 * flujo de checkout (ya cubierto por flujo-feliz.spec.js).
 */
test.describe("Admin cambia el estado de una orden y persiste tras recargar", () => {
  let producto;
  let orden;
  let usuarioAdmin;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Admin Estado",
      precio: "4500",
    });

    orden = await crearOrdenDeTest({
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

    usuarioAdmin = await crearUsuarioAdminDeTest();
  });

  test.afterEach(async () => {
    if (orden?.id) {
      await borrarOrdenDeTest(orden.id, orden.clienteId);
    }
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
    if (usuarioAdmin?.id) {
      await borrarUsuarioAdminDeTest(usuarioAdmin.id);
    }
  });

  test("login real -> cambiar estado -> reload -> el nuevo estado sigue ahí (persistido en DB)", async ({
    page,
  }) => {
    // 1. Login real por el formulario.
    await page.goto("/catalogo/admin/login");
    await page.getByLabel("Email").fill(usuarioAdmin.email);
    await page.getByLabel("Contraseña").fill(usuarioAdmin.password);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

    // 2. Navegar al detalle de la orden sembrada.
    await page.goto(`/catalogo/admin/ordenes/${orden.id}`);
    await expect(page.getByRole("heading", { name: `Orden #${orden.id}` })).toBeVisible();

    const selectEstado = page.getByLabel("Cambiar estado de la orden");
    await expect(selectEstado).toHaveValue("PENDIENTE");

    // 3. Cambiar el estado vía el <select> de la UI. Elegir un estado nuevo
    // no dispara el PATCH directo: abre `DialogoNotificarEstado`, que decide
    // si además se le avisa al cliente por mail. Acá se confirma "Guardar
    // sin notificar" — el cliente de test se siembra con `email: null`
    // (`crearClienteDeTest`), así que la acción primaria del diálogo
    // ("Notificar y guardar") está deshabilitada; como bonus, la corrida
    // ejercita la rama sin email. Recién tras ese click se manda el PATCH,
    // así que el valor final del select y el `enabled` se esperan después de
    // confirmar el diálogo, no después de `selectOption`.
    await selectEstado.selectOption("CONFIRMADA");
    await page.getByRole("button", { name: "Guardar sin notificar" }).click();
    await expect(selectEstado).toHaveValue("CONFIRMADA");
    await expect(selectEstado).toBeEnabled();

    // 4. Reload real de página — cualquier estado optimista en memoria de
    // React se pierde acá; si lo que quedó visible después es lo mismo,
    // es porque efectivamente se escribió en la DB y se releyó de ahí.
    await page.reload();
    await expect(page.getByRole("heading", { name: `Orden #${orden.id}` })).toBeVisible();
    await expect(page.getByLabel("Cambiar estado de la orden")).toHaveValue("CONFIRMADA");

    // 5. Verificación directa en la DB, no tautológica respecto de lo que la
    // UI acaba de mostrar tras el reload.
    const ordenEnDb = await prisma.orden.findUnique({ where: { id: orden.id } });
    expect(ordenEnDb.estado).toBe("CONFIRMADA");
  });
});
