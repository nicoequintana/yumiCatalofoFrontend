import { Link } from "react-router-dom";
import EstadoVacio from "./EstadoVacio.jsx";
import ProductCard from "./ProductCard.jsx";
import useOfertas from "../hooks/useOfertas.js";

/**
 * "Ofertas de la semana" — los productos con descuento vigente.
 *
 * Existe porque el módulo de promociones no tenía NINGUNA superficie en la
 * home: el precio efectivo llegaba bien a la card, pero un visitante que
 * entraba por la home solo encontraba una oferta tropezándose con ella.
 *
 * NO CALCULA NADA: `ProductCard` ya recibe `precioEfectivo` y `descuento`
 * resueltos por el backend.
 *
 * Sin ofertas y sin error no se renderiza — y esa es la MISMA condición que
 * apaga el slide automático del carrusel, no dos.
 */
export default function RielOfertas() {
  const { productos, error } = useOfertas();

  if (error) {
    return (
      <section className="mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
        <EstadoVacio
          icono="cloud_off"
          titulo="No se pudieron cargar las ofertas"
          mensaje={error}
        />
      </section>
    );
  }

  if (productos.length === 0) return null;

  return (
    <section className="w-full bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pt-10 md:px-margin-desktop">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Ofertas de la semana
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Lo que está con descuento ahora.
            </p>
          </div>
          <Link
            to="/coleccion?conDescuento=1"
            className="shrink-0 font-label-md text-label-md text-primary underline-offset-4 hover:underline"
          >
            Ver todas
          </Link>
        </div>
      </div>

      {/* La pista va a ancho completo, fuera del contenedor centrado, para que
          la tarjeta cortada al borde derecho se lea como "hay más" — la señal
          de scroll que no necesita ningún texto. */}
      {/* `py-8` y no solo `pb-*`: `overflow-x-auto` obliga al navegador a
          calcular `overflow-y: auto`, así que este contenedor RECORTA también
          en vertical. Sin padding arriba, el anillo que `ProductCard` le pone a
          los destacados (`ring-2`, que dibuja fuera de la caja) se corta justo
          en el borde superior. */}
      <div className="w-full overflow-x-auto overscroll-x-contain py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-gutter px-margin-mobile pt-6 md:px-margin-desktop">
          {productos.map((producto) => (
            <div key={producto.id} className="w-[220px] shrink-0 md:w-[260px]">
              <ProductCard producto={producto} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
