import MediaUploader from "../../MediaUploader.jsx";
import SeccionGenerarImagenes, { MAX_REFERENCIAS } from "./SeccionGenerarImagenes.jsx";
import PreviaTextoImpreso from "./PreviaTextoImpreso.jsx";
import GaleriaGeneradas from "./GaleriaGeneradas.jsx";

/**
 * Solapa "Imágenes": el único lugar donde se piensa en las fotos de un producto.
 *
 * Tres bloques, y el orden no es casual: las fotos del catálogo van primero
 * porque son el estado del producto, que es lo que se consulta cada vez que se
 * abre la solapa. Generar y elegir son pasos ocasionales.
 *
 * La generación y la galería solo aparecen en un producto ya guardado: sin id
 * no hay contra qué generar ni carpeta que listar.
 *
 * Se oculta con `hidden` en vez de desmontarse, como el resto de los paneles
 * del editor: desmontar perdería la selección de la galería y volvería a pedir
 * el listado a Cloudinary en cada ida y vuelta entre pestañas.
 */
function Bloque({ numero, titulo, ayuda, children }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-low p-4 md:p-6">
      <h2 className="font-headline-md text-headline-md mb-1 flex items-center gap-3 text-on-surface">
        <span className="font-label-sm text-label-sm grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary">
          {numero}
        </span>
        {titulo}
      </h2>
      {ayuda ? <p className="font-body-md text-body-md mb-4 text-on-surface-variant">{ayuda}</p> : null}
      {children}
    </section>
  );
}

function SolapaImagenes({ visible, productoId, valores, onChangeFotos, onChangeVideo, onAdoptadas }) {
  return (
    // Sin `lg:flex`: la solapa comparte la columna izquierda con el
    // formulario, así que en TODOS los tamaños se muestra solo la activa. Un
    // `lg:flex` la volvería visible en escritorio incluso con el formulario
    // seleccionado, y las dos se apilarían.
    <div className={`flex flex-col gap-6 p-4 md:p-8 ${visible ? "" : "hidden"}`}>
      <Bloque
        numero="1"
        titulo="Fotos del catálogo"
        ayuda="Las dos primeras posiciones no son intercambiables: la portada es la que se ve en la grilla y al compartir el link, y la segunda acompaña «¿Qué problema resuelve?»."
      >
        <MediaUploader
          fotos={valores.fotos}
          video={valores.video}
          onChangeFotos={onChangeFotos}
          onChangeVideo={onChangeVideo}
        />
      </Bloque>

      {productoId ? (
        <Bloque
          numero="2"
          titulo="Generar con IA"
          ayuda={`Mandá hasta ${MAX_REFERENCIAS} fotos de referencia junto con los datos del producto. Las referencias no se guardan como fotos: viajan y se descartan.`}
        >
          <PreviaTextoImpreso producto={valores} />
          <SeccionGenerarImagenes productoId={productoId} />
        </Bloque>
      ) : null}

      {productoId ? (
        <Bloque
          numero="3"
          titulo="Generadas por IA"
          ayuda="Elegí cuáles pasan al catálogo. Entran en las primeras posiciones libres y después las reordenás arriba."
        >
          <GaleriaGeneradas
            productoId={productoId}
            fotosActuales={valores.fotos}
            onAdoptadas={onAdoptadas}
            visible={visible}
          />
        </Bloque>
      ) : null}
    </div>
  );
}

export default SolapaImagenes;
