import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  claseBotonPrimario,
  claseCampoConIcono,
  claseCampoPassword,
  claseCampoSinIcono,
  claseEncabezado,
  claseEtiqueta,
  claseEtiquetaSuelta,
  clasePagina,
  clasePaginaDensa,
  claseTarjetaEscritorio,
} from "./clasesCuenta.js";

const dirCuenta = dirname(fileURLToPath(import.meta.url));
const PANTALLAS = ["Entrar.jsx", "MiCuenta.jsx", "Seguridad.jsx", "Datos.jsx"];

function fuente(archivo) {
  return readFileSync(join(dirCuenta, archivo), "utf8");
}

/*
 * El bloque del campo de texto llegó a estar CUATRO veces y el del botón TRES,
 * repartidos entre tres archivos: la constante se extrajo una vez por archivo
 * en vez de una sola vez compartida, y dos de las copias eran byte-idénticas
 * entre archivos distintos. Ya habían divergido. Este guard es lo que impide
 * que la quinta copia entre sin que nadie la vea.
 */
describe("las pantallas de cuenta no vuelven a duplicar las clases", () => {
  // Se ancla en el `py-3.5` que sigue al fondo: es lo que separa un CAMPO de
  // una TARJETA, que comparte caja y fondo pero lleva `p-4`. Las tarjetas
  // (`MiCuenta`, la caja de Google de `Seguridad`) quedan como están: no son
  // parte de esta extracción.
  it.each(PANTALLAS)("%s no escribe la caja del campo a mano", (archivo) => {
    expect(fuente(archivo)).not.toMatch(
      /rounded-2xl border border-outline-variant bg-surface-container-lowest py-3\.5/,
    );
  });

  it.each(PANTALLAS)("%s no escribe el botón primario a mano", (archivo) => {
    expect(fuente(archivo)).not.toMatch(/bg-primary px-4 py-3\.5/);
  });

  it.each(PANTALLAS)("%s no escribe el contenedor de página a mano", (archivo) => {
    expect(fuente(archivo)).not.toMatch(/mx-auto flex max-w-sm flex-col/);
  });

  it.each(PANTALLAS)("%s no escribe la tarjeta a mano", (archivo) => {
    expect(fuente(archivo)).not.toMatch(
      /lg:rounded-3xl lg:border lg:border-outline-variant lg:bg-surface-container-lowest lg:p-12 lg:shadow-sm/,
    );
  });

  it.each(PANTALLAS)("%s no escribe el encabezado a mano", (archivo) => {
    expect(fuente(archivo)).not.toMatch(/flex flex-col gap-1\.5 lg:text-center/);
  });
});

/*
 * Las DOS diferencias que son a propósito y que aplanarlas rompería. Están acá
 * porque "son iguales salvo por esto" es exactamente lo que invita a unificar
 * de más en la próxima pasada.
 */
describe("las diferencias que NO se aplanan", () => {
  it("el campo sin ícono lleva px-4, y el que reserva el hueco del ícono lleva pl-11", () => {
    // `Datos` no dibuja íconos dentro de sus campos: con `pl-11` el texto
    // arrancaría corrido contra un hueco vacío.
    expect(claseCampoSinIcono).toContain("px-4");
    expect(claseCampoSinIcono).not.toContain("pl-11");
    expect(claseCampoConIcono).toContain("pl-11");
    expect(claseCampoPassword).toContain("pl-11");
  });

  it("el campo de CampoPassword NO trae ancho: ese componente pone `w-full pr-12` él mismo", () => {
    // `className` REEMPLAZA la apariencia en `CampoPassword`, pero sus clases
    // estructurales se suman aparte. Mandar `w-full` acá es ruido, y mandar un
    // `pr-*` le pisaría el hueco del ojito.
    expect(claseCampoPassword).not.toContain("w-full");
    expect(claseCampoPassword).not.toMatch(/\bpr-\d/);
    expect(claseCampoConIcono).toContain("w-full");
    expect(claseCampoSinIcono).toContain("w-full");
  });

  it("Mi cuenta usa un gap más chico que los formularios", () => {
    expect(clasePagina).toContain("gap-6");
    expect(clasePaginaDensa).toContain("gap-4");
  });
});

describe("convenciones del proyecto", () => {
  const todas = {
    claseBotonPrimario,
    claseCampoConIcono,
    claseCampoPassword,
    claseCampoSinIcono,
    claseEncabezado,
    claseEtiqueta,
    claseEtiquetaSuelta,
    clasePagina,
    clasePaginaDensa,
    claseTarjetaEscritorio,
  };

  it.each(Object.entries(todas))("%s no lleva ningún hex literal", (_nombre, clases) => {
    expect(clases).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("cada token tipográfico va con su `font-*` pareado", () => {
    for (const [nombre, clases] of Object.entries(todas)) {
      for (const [, token] of clases.matchAll(/\btext-((?:label|body|headline|display)-[a-z-]+)/g)) {
        expect(`${nombre}: ${clases}`).toContain(`font-${token}`);
      }
    }
  });

  it("el CTA principal sale en terracota (`bg-primary`), no en el teal de marca", () => {
    expect(claseBotonPrimario).toContain("bg-primary");
    expect(claseBotonPrimario).not.toContain("bg-brand-teal");
  });
});

/*
 * Layout de escritorio: `clasePagina`/`clasePaginaDensa` deciden el ANCHO del
 * contenedor en `lg`, y `claseTarjetaEscritorio` decide la tarjeta que
 * envuelve el formulario. Como las tres son constantes compartidas por las
 * cuatro pantallas, un cambio acá alcanza a todas — por eso el guard vive en
 * este archivo y no repetido en cada test de pantalla.
 */
describe("clases de escritorio (lg)", () => {
  it("las pantallas de formulario pasan a la tarjeta centrada de 34rem", () => {
    expect(clasePagina).toContain("lg:max-w-[34rem]");
  });

  it("MiCuenta pasa a un contenedor ancho de container-max", () => {
    expect(clasePaginaDensa).toContain("lg:max-w-container-max");
  });

  it("la tarjeta de escritorio lleva borde, fondo, padding y sombra, y ninguno actúa antes de lg", () => {
    expect(claseTarjetaEscritorio).toContain("lg:rounded-3xl");
    expect(claseTarjetaEscritorio).toContain("lg:border");
    expect(claseTarjetaEscritorio).toContain("lg:bg-surface-container-lowest");
    expect(claseTarjetaEscritorio).toContain("lg:p-12");
    expect(claseTarjetaEscritorio).toContain("lg:shadow-sm");
    // Ninguna clase de tarjeta sin el prefijo `lg:`: en mobile no hay tarjeta.
    // Cubre las CINCO clases, no solo `rounded-3xl`: un guard que solo mira
    // una de cinco deja pasar sin aviso a las otras cuatro si alguna pierde
    // el prefijo.
    expect(claseTarjetaEscritorio).not.toMatch(/(?<!lg:)\brounded-3xl\b/);
    expect(claseTarjetaEscritorio).not.toMatch(/(?<!lg:)\bborder\b/);
    expect(claseTarjetaEscritorio).not.toMatch(/(?<!lg:)bg-surface-container-lowest\b/);
    expect(claseTarjetaEscritorio).not.toMatch(/(?<!lg:)\bp-12\b/);
    expect(claseTarjetaEscritorio).not.toMatch(/(?<!lg:)\bshadow-sm\b/);
  });

  it("el fondo del campo baja un tono en escritorio para no perderse dentro de la tarjeta blanca", () => {
    // Las tres constantes de campo derivan de la misma base común: un solo
    // cambio ahí alcanza para email, contraseñas y los campos sin ícono.
    expect(claseCampoConIcono).toContain("lg:bg-surface-container-low");
    expect(claseCampoSinIcono).toContain("lg:bg-surface-container-low");
    expect(claseCampoPassword).toContain("lg:bg-surface-container-low");
  });
});
