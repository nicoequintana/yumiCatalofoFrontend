import { useEffect, useId, useState } from "react";
import CabezaSeccion from "./CabezaSeccion.jsx";
import EstadoVacio from "./EstadoVacio.jsx";
import ProductCard from "./ProductCard.jsx";

/** Dos filas de la grilla de escritorio; el resto está en "Ver todas las ofertas". */
const PRODUCTOS_EN_GRILLA = 8;

const SEGUNDOS_POR_DIA = 86400;

/**
 * Segundos que faltan hasta `finVigencia`, actualizados una vez por segundo.
 *
 * ⚠️ NO CALCULA FECHAS DE NEGOCIO: el instante de fin lo resuelve el backend
 * (`resolverFinVigenciaHome`, medianoche argentina). Acá solo se resta
 * `Date.now()` a ese instante. El intervalo se apaga al llegar a 0.
 *
 * `ahora` se vuelve a tomar EN EL RENDER en que cambia `finVigencia` (patrón
 * de estado derivado de React): si la promo llega después del montaje, un
 * `ahora` viejo la mostraría vigente con el reloj congelado, porque el efecto
 * no arranca intervalo para un fin que ya pasó.
 *
 * @returns {number} segundos restantes (0 si venció o el instante es ilegible)
 */
function useSegundosRestantes(finVigencia) {
  const fin = finVigencia ? Date.parse(finVigencia) : Number.NaN;
  const [reloj, setReloj] = useState(() => ({ fin, ahora: Date.now() }));

  let ahora = reloj.ahora;
  // `Object.is` y no `!==`: `NaN !== NaN` dispararía un render infinito.
  if (!Object.is(reloj.fin, fin)) {
    ahora = Date.now();
    setReloj({ fin, ahora });
  }

  useEffect(() => {
    if (!Number.isFinite(fin) || fin <= Date.now()) return undefined;

    const id = setInterval(() => {
      const momento = Date.now();
      setReloj({ fin, ahora: momento });
      if (momento >= fin) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [fin]);

  if (!Number.isFinite(fin)) return 0;
  return Math.max(0, Math.ceil((fin - ahora) / 1000));
}

const dosDigitos = (n) => String(n).padStart(2, "0");

/** Un casillero del reloj (mockup `.reloj b`). */
function Casillero({ children }) {
  return (
    <b className="inline-grid h-7 min-w-[30px] place-items-center rounded-lg bg-primary px-1 font-label-md text-[13px] font-bold leading-none tabular-nums text-on-primary md:h-8 md:min-w-9 md:text-[15px]">
      {children}
    </b>
  );
}

function Reloj({ segundos }) {
  const dias = Math.floor(segundos / SEGUNDOS_POR_DIA);
  const horas = Math.floor((segundos % SEGUNDOS_POR_DIA) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  const id = useId();

  // Nombre accesible = rótulo oculto + los dígitos. Con `aria-label` el lector
  // anunciaba solo el rótulo, sin cuánto falta. `timer` no toma el nombre del
  // contenido por sí solo, así que se autorreferencia con `aria-labelledby`.
  return (
    <span
      id={id}
      role="timer"
      aria-labelledby={id}
      className="inline-flex items-center gap-1.5 font-label-md text-[12px] font-semibold leading-none text-primary md:text-[13px]"
    >
      <span className="sr-only">Tiempo restante de la promoción: </span>
      Termina en{" "}
      {dias > 0 ? (
        <>
          <Casillero>{dias}</Casillero>d{" "}
        </>
      ) : null}
      <Casillero>{dosDigitos(horas)}</Casillero>:<Casillero>{dosDigitos(minutos)}</Casillero>:
      <Casillero>{dosDigitos(resto)}</Casillero>
    </span>
  );
}

/**
 * "Promos activas" — reemplaza a `RielOfertas` (T14). Dos modos:
 *
 * 1. **Con promo destacada vigente** (`promoDestacada` con productos y reloj
 *    > 0): su nombre como título, sus productos y un reloj hasta `finVigencia`.
 * 2. **Sin ella** (o cuando el reloj llega a 0): todos los productos con
 *    descuento (`useOfertas`), SIN reloj — lo que hacía `RielOfertas`.
 *
 * En el modo 2, `errorOfertas` muestra `EstadoVacio` `cloud_off` y "sin
 * ofertas" no renderiza nada: "falló la carga" no es "no hay ofertas".
 *
 * PRESENTACIONAL: `Catalogo.jsx` llama a `usePromoDestacada` y `useOfertas`.
 * NO CALCULA PRECIOS: `ProductCard` recibe el efectivo resuelto.
 *
 * @param {{id: number, nombre: string, finVigencia: string, productos: Array}|null} [promoDestacada]
 * @param {Array} [ofertas]
 * @param {string|null} [errorOfertas]
 */
export default function PromosActivas({ promoDestacada = null, ofertas = [], errorOfertas = null }) {
  const tieneProductos = Boolean(promoDestacada?.productos?.length);
  // Sin productos la promo no se muestra: no tiene sentido que el reloj corra.
  const segundos = useSegundosRestantes(tieneProductos ? promoDestacada.finVigencia : null);
  const promoVigente = tieneProductos && segundos > 0;

  if (!promoVigente && errorOfertas) {
    return (
      <section className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
        <EstadoVacio icono="cloud_off" titulo="No se pudieron cargar las ofertas" mensaje={errorOfertas} />
      </section>
    );
  }

  const productos = promoVigente ? promoDestacada.productos : ofertas;
  if (productos.length === 0) return null;

  return (
    <section className="w-full bg-gradient-to-b from-secondary-container/20 to-secondary-container/10">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-12">
        {promoVigente ? (
          <CabezaSeccion
            eyebrow={
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-secondary pl-2.5 pr-3 font-label-sm text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-on-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  local_fire_department
                </span>
                Promo activa
              </span>
            }
            titulo={promoDestacada.nombre}
            bajada={
              <div className="mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
                <Reloj segundos={segundos} />
              </div>
            }
            enlace={{ texto: "Ver todas las ofertas", to: "/coleccion?conDescuento=1" }}
          />
        ) : (
          <CabezaSeccion
            titulo="Ofertas de la semana"
            bajada="Lo que está con descuento ahora."
            enlace={{ texto: "Ver todas las ofertas", to: "/coleccion?conDescuento=1" }}
          />
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {productos.slice(0, PRODUCTOS_EN_GRILLA).map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      </div>
    </section>
  );
}
