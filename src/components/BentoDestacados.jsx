import { Link } from "react-router-dom";
import BotonFavorito from "./BotonFavorito.jsx";
import { formatPrecio } from "../utils/formato.js";

/**
 * Grid bento de hasta 4 productos con destacado:true, inspirado en el bloque
 * "Hallazgos del día" del mockup editorial. Se oculta por completo si hay
 * menos de 4 destacados — un bento con huecos se ve roto, así que preferimos
 * no mostrar la sección antes que mostrarla incompleta.
 *
 * Layout fijo de 4 slots (mockup "Vibrant Editorial Discovery"): 1 celda
 * grande, 2 chicas, 1 mediana ancha — todas comparten la misma estructura
 * visual (imagen full-bleed + gradiente + badge de etiqueta + nombre +
 * BotonFavorito), solo cambia el span y si se muestra el precio.
 */
function CeldaBento({ producto, spanClass, mostrarPrecio = false }) {
  const foto = producto.fotos?.[0];

  return (
    <Link
      to={`/producto/${producto.id}`}
      className={`group relative overflow-hidden rounded-xl bg-surface-container ${spanClass}`}
    >
      {foto ? (
        <img
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={foto.url}
          alt={producto.nombre}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent" />
      <BotonFavorito
        productoId={producto.id}
        className="absolute right-2 top-2 z-10 rounded-full bg-surface-container-lowest/90 shadow-sm"
      />
      <div className="absolute bottom-0 left-0 flex flex-col gap-2 p-6">
        {producto.etiqueta ? (
          <span className="font-label-md text-label-md w-max rounded-full bg-surface/70 px-3 py-1 uppercase tracking-wide text-on-surface backdrop-blur-md">
            {producto.etiqueta}
          </span>
        ) : null}
        <h3 className="font-headline-md text-headline-md text-surface">{producto.nombre}</h3>
        {mostrarPrecio ? (
          <span className="font-body-lg text-body-lg text-surface-variant">
            {formatPrecio(producto.precio)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function BentoDestacados({ productos }) {
  const destacados = productos.filter((p) => p.destacado).slice(0, 4);

  if (destacados.length < 4) return null;

  const [grande, chico1, chico2, mediana] = destacados;

  return (
    <section className="w-full bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mb-12 flex flex-col gap-2">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Hallazgos del día</h2>
          <p className="font-body-lg text-body-lg max-w-2xl text-on-surface-variant">
            Nuestra curaduría del momento — piezas destacadas que no vas a querer perderte.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3 md:auto-rows-[300px]">
          <CeldaBento producto={grande} spanClass="md:col-span-2" />
          <CeldaBento producto={chico1} spanClass="col-span-1" />
          <CeldaBento producto={chico2} spanClass="col-span-1" />
          <CeldaBento producto={mediana} spanClass="md:col-span-2" mostrarPrecio />
        </div>
      </div>
    </section>
  );
}

export default BentoDestacados;
