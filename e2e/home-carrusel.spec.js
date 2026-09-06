import { expect, test } from "@playwright/test";
import {
  MARCA_TEST,
  borrarCampaniaDeTest,
  borrarProductoDeTest,
  crearCampaniaDeTest,
  crearProductoDeTest,
  prisma,
} from "./helpers/db.js";

/**
 * La home comercial (Task 20): el carrusel de campañas y ofertas arriba de
 * todo, y el primer producto a un scroll de distancia — no a 1.430px.
 *
 * QUÉ CUBRE QUE NO CUBRA UN TEST UNITARIO. `CarruselCampanias` pinta el CTA
 * con la ruta que YA resolvió el backend (`ctaDestino` de `aSlideCampania`);
 * lo que ningún test unitario de ninguno de los dos lados puede afirmar es
 * que el router del frontend sepa abrir esa ruta exacta — mismo motivo por el
 * que existe `admin-campania-editor.spec.js` para el cartel.
 *
 * ⚠️ **Este spec NO usa `neutralizarContextoComercial`, a propósito**: prueba
 * justamente el contexto (`GET /campanias/activas`, que alimenta el
 * carrusel). La campaña de prueba se crea con **prioridad 999** porque la
 * base de desarrollo puede tener una campaña real vigente compitiendo por el
 * mismo slide — igual que en `admin-campania-editor.spec.js`.
 *
 * ⚠️ **El cierre del cartel es genérico, no atado a esta campaña.** Desde el
 * 05/09 el cartel se muestra una vez por día por campaña
 * (`docs/reglas/campanias.md`), así que la campaña REAL de la base de
 * desarrollo puede mostrar el suyo antes de que este test llegue a tocar el
 * carrusel de abajo — es `fixed inset-0` e intercepta el primer click igual
 * que el nuestro lo haría. Esta campaña de test deja `modalActivo` en su
 * default (`false`): no compite por ese recurso, así que cerrar "el cartel
 * que haya, sea de quien sea" reemplaza acá a `neutralizarContextoComercial`.
 */
/**
 * Cierra el cartel si aparece, sin importar de qué campaña sea.
 *
 * El modal y el carrusel leen el MISMO `GET /campanias/activas` (cache
 * module-level de `useContextoComercial`), así que si el cartel va a
 * aparecer, lo hace en la misma ventana en la que se resuelve ese fetch —
 * pero puede ganarle por unos milisegundos a la aserción de que el carrusel
 * ya está visible. Un `isVisible()` sin espera se perdía esa carrera: el
 * cartel montaba recién DESPUÉS del chequeo y quedaba interceptando el click
 * del paso siguiente.
 */
async function cerrarCartelSiAparece(page) {
  const cartel = page.getByRole("dialog");
  const aparecio = await cartel
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (aparecio) {
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(cartel).toBeHidden();
  }
}

test.describe("La home abre con el carrusel de campañas y ofertas", () => {
  let producto;
  let campania;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: `${MARCA_TEST}Producto Carrusel`,
      precio: "5000",
    });

    campania = await crearCampaniaDeTest({
      nombre: `${MARCA_TEST}Campaña Carrusel`,
      estado: "HABILITADA",
      // Prioridad ALTA para ganarle a cualquier campaña vigente de la base de
      // desarrollo — el primer slide del carrusel lo decide este número.
      prioridad: 999,
      bannerEnHome: true,
      bannerTitulo: `${MARCA_TEST}Vitrina del carrusel`,
      bannerTexto: "Los productos de esta vitrina, en la home.",
      // La vitrina es la que sostiene el CTA: con ella vacía, `resolverDestinoCta`
      // degrada a `/coleccion` y este test no probaría nada.
      modalCtaTipo: "CAMPANIA",
    });

    await prisma.campaniaProducto.create({
      data: { campaniaId: campania.id, productId: producto.id },
    });
  });

  test.afterEach(async () => {
    // La campaña primero: se lleva su `CampaniaProducto` por cascade.
    await borrarCampaniaDeTest(campania.id);
    await borrarProductoDeTest(producto.id);
  });

  test("el slide de la campaña abre, el CTA lleva a su vitrina, y el primer producto entra sin scrollear de más", async ({
    page,
  }) => {
    await test.step("un cartel abierto (de cualquier campaña) no bloquea el carrusel de abajo", async () => {
      await page.goto("/");
      await cerrarCartelSiAparece(page);
    });

    const region = page.getByRole("region", { name: "Campañas y ofertas" });

    await test.step("el slide de la campaña de prueba se ve primero, por prioridad", async () => {
      await expect(region).toBeVisible();
      await expect(region.getByText(`${MARCA_TEST}Vitrina del carrusel`)).toBeVisible();
    });

    await test.step("el CTA del slide lleva a la vitrina de la campaña", async () => {
      // Repetido a propósito: el cartel puede montar recién acá si el fetch de
      // `activas` tardó más que el chequeo del primer paso.
      await cerrarCartelSiAparece(page);
      await region.getByRole("link", { name: "Ver más" }).click();

      // La ruta la armó el backend (`resolverDestinoCta`) contra la vitrina que
      // existe hoy. Que el router del frontend la sepa abrir es exactamente lo
      // que ningún test unitario puede afirmar.
      await expect(page).toHaveURL(new RegExp(`/coleccion\\?campania=${campania.id}$`));
      await expect(page.getByText(`Campaña: ${campania.nombre}`)).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(producto.nombre) })).toBeVisible();
    });

    await test.step("en un teléfono de 412px, el primer producto entra sin scrollear una segunda pantalla", async () => {
      await page.setViewportSize({ width: 412, height: 915 });
      await page.goto("/");

      // El cartel de la campaña real, si lo hubo, ya quedó cerrado: la clave del
      // tope es `campaniaId + claveDia` y seguimos en el mismo contexto de
      // browser (mismo `localStorage`), así que no hace falta repetir el cierre.
      const primerProducto = page.locator('a[href^="/producto/"]').first();
      await expect(primerProducto).toBeVisible();

      const caja = await primerProducto.boundingBox();
      const alto = page.viewportSize().height;
      // Histórico (Task 19, 05/09/2026): con el hero arriba, el primer producto
      // entraba a los 1.430px en este mismo ancho — una pantalla y media de
      // scroll antes de ver algo comprable. Hoy tiene que entrar SIN scrollear,
      // o sea antes del borde de abajo del viewport.
      expect(caja.y).toBeLessThan(alto);
    });
  });
});
