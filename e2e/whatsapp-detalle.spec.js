import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 4: click en WhatsApp desde el detalle de
 * producto.
 *
 * No se deja navegar de verdad a wa.me (sería un test frágil, dependiente de
 * red externa, y el link abre en `target="_blank"` — dejarlo completar
 * abriría una pestaña real de un dominio externo). En cambio:
 *   - Se lee el atributo `href` del link después del click en vez de
 *     intentar interceptar-y-cancelar la navegación: más simple y no
 *     requiere manejar el evento `popup` de una pestaña nueva que después
 *     hay que cerrar a mano.
 *   - El número de teléfono esperado se obtiene pegándole al mismo endpoint
 *     que consume el frontend (`GET /api/config/whatsapp`, vía
 *     `useWhatsapp.js`) en vez de asumir un valor — así el test no rompe si
 *     `WHATSAPP_NUMERO` cambia en `.env`, y further confirma que la UI
 *     realmente está usando la config real del backend.
 *   - El evento `POST /api/eventos` con `tipo: "CLICK_WHATSAPP"` se captura
 *     con `page.waitForRequest` ANTES del click (la promesa arranca a
 *     escuchar antes de disparar la acción que la resuelve).
 */
test.describe("Click en WhatsApp desde el detalle de producto", () => {
  let producto;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto WhatsApp",
      precio: "990.00",
    });
  });

  test.afterEach(async () => {
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("el botón de WhatsApp arma el link esperado, sin navegar de verdad", async ({ page, request }) => {
    // Config real del backend — misma fuente de verdad que useWhatsapp.js.
    const configRes = await request.get("http://localhost:4000/api/config/whatsapp");
    expect(configRes.ok()).toBe(true);
    const config = await configRes.json();

    // `WHATSAPP_NUMERO` es una variable de entorno del backend (ver
    // `config.controller.js`), no algo que este test pueda sembrar — si el
    // `.env` local no la tiene configurada, `useWhatsapp.js` deliberadamente
    // no renderiza el botón (`if (!url) return null`). Eso es responsabilidad
    // de la configuración del entorno, no un bug de este escenario; se
    // documenta con un skip explícito en vez de fallar el run entero o, peor,
    // asumir un valor hardcodeado que no reflejaría la config real.
    test.skip(!config.numero, "WHATSAPP_NUMERO no está configurado en este entorno (.env del backend).");

    await page.goto(`/producto/${producto.id}`);
    await expect(page.getByRole("heading", { name: "E2E-TEST-Producto WhatsApp" })).toBeVisible();

    const botonWhatsapp = page.getByRole("link", { name: "Contactar por WhatsApp" });
    await expect(botonWhatsapp).toBeVisible();

    // href ya está armado en el DOM antes del click (useWhatsapp.js arma la
    // URL sincrónicamente una vez que `config` está cargado) — se puede leer
    // directo, sin necesidad de clickear primero.
    const href = await botonWhatsapp.getAttribute("href");
    expect(href).toContain(`https://wa.me/${config.numero}?text=`);

    const url = new URL(href);
    const mensaje = url.searchParams.get("text");
    expect(mensaje).toContain("E2E-TEST-Producto WhatsApp");
    expect(mensaje).toContain(`/producto/${producto.id}`);

    // El link real es target="_blank" — clickearlo abriría una pestaña nueva
    // hacia un dominio externo (wa.me). Se espera el evento `popup` y se
    // cierra esa pestaña inmediatamente sin esperar a que cargue de verdad,
    // así el test no depende de red externa ni completa la navegación real.
    const [popup] = await Promise.all([page.waitForEvent("popup"), botonWhatsapp.click()]);
    await popup.close();
  });

  test("el evento CLICK_WHATSAPP se envía con tipo y productId correctos", async ({ page, request }) => {
    // Mismo motivo que el test anterior: sin `WHATSAPP_NUMERO` configurado,
    // `BotonWhatsapp` no renderiza (`useWhatsapp.js` devuelve `url: null`),
    // así que no hay nada que clickear.
    const configRes = await request.get("http://localhost:4000/api/config/whatsapp");
    const config = await configRes.json();
    test.skip(!config.numero, "WHATSAPP_NUMERO no está configurado en este entorno (.env del backend).");

    let bodyEvento = null;
    await page.route("**/api/eventos", async (route) => {
      bodyEvento = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: 1 }) });
    });

    await page.goto(`/producto/${producto.id}`);
    const botonWhatsapp = page.getByRole("link", { name: "Contactar por WhatsApp" });
    await expect(botonWhatsapp).toBeVisible();

    const [popup] = await Promise.all([page.waitForEvent("popup"), botonWhatsapp.click()]);
    await popup.close();

    await expect.poll(() => bodyEvento).not.toBeNull();
    expect(bodyEvento.tipo).toBe("CLICK_WHATSAPP");
    expect(bodyEvento.productId).toBe(producto.id);
  });
});
