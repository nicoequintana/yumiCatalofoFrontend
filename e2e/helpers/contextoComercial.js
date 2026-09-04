/**
 * Neutraliza el contexto comercial (Doodle y modal) para los specs públicos.
 *
 * POR QUÉ EXISTE. Desde que hay campañas, `GET /api/campanias/activas` puede
 * devolver un modal — y un modal es `fixed inset-0`, o sea que **intercepta el
 * primer click de cualquier página**. Sin esto, tener una campaña activa en la
 * base de dev rompe cinco specs con el error más confuso posible:
 *
 *     <div class="fixed inset-0 z-[60] …"> intercepts pointer events
 *
 * Nada en ese mensaje dice "hay una campaña prendida". Pasó de verdad: los
 * cinco fallos se veían como bugs del checkout.
 *
 * QUÉ HACE. Intercepta la request y devuelve el contexto VACÍO. No toca la
 * base: mutar datos desde un helper de test es peor que aislar la respuesta, y
 * además dejaría la suite pisando campañas reales de quien la corre.
 *
 * Los specs públicos no prueban campañas —el Doodle, el modal y el contador
 * tienen sus tests unitarios—, así que estabilizar esta respuesta los aísla en
 * vez de recortarles cobertura.
 *
 * ⚠️ **Hace MÁS falta desde que el cartel se muestra en cada carga.** El tope de
 * "una vez por día por visitante" se retiró: ya no hay ningún `localStorage` que
 * silencie el segundo `goto` de un spec.
 *
 * `claveDia` viaja igual y con un valor real —lo consume el calendario del
 * panel—: devolverlo en `null` sería un estado que la API nunca produce cuando
 * responde bien.
 *
 * La excepción es `admin-campania-editor.spec.js`, que NO llama a este helper
 * porque el cartel es justamente lo que prueba.
 */
export async function neutralizarContextoComercial(page) {
  await page.route("**/api/campanias/activas*", async (route) => {
    const hoy = new Date();
    // Día ARGENTINO (UTC-3), la misma definición que usa el backend.
    const claveDia = new Date(hoy.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ claveDia, doodle: null, modal: null }),
    });
  });
}
