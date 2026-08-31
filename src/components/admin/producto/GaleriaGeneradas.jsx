import { useCallback, useEffect, useRef, useState } from "react";
import {
  getImagenesGeneradas,
  adoptarImagenesGeneradas,
  borrarImagenesGeneradas,
} from "../../../api/products.js";
import Spinner from "../../Spinner.jsx";

/** Espejo de `MAX_FOTOS` del backend. Acá solo evita un viaje que el servidor rechazaría igual. */
const MAX_FOTOS = 10;

/**
 * Galería de lo que n8n dejó en `productos/{sku}`, con selección para pasar
 * imágenes a la ficha.
 *
 * Distingue tres estados que se confunden fácil y no son lo mismo: la carpeta
 * vacía (todavía no se generó), el fallo de carga (no se pudo consultar) y la
 * galería con contenido. Un `catch` que solo vacía la lista haría que un
 * Cloudinary caído se lea como "no generaste nada".
 *
 * Adoptar no sube nada: el backend crea filas que apuntan al archivo que ya
 * está. Por eso es inmediato y por eso el borrado conserva las que están en uso
 * — son el mismo archivo.
 *
 * `visible` (default `true` para no romper un uso directo del componente sin
 * pasarlo) es la señal de "¿la solapa Imágenes ya se mostró alguna vez?": la
 * primera carga se difiere hasta ahí para no gastar cuota de la Admin API de
 * Cloudinary —más ajustada que la de entrega— en cada editor que se abre,
 * aunque nadie mire esta pestaña. Una vez que se cargó, sigue viva: no se
 * vuelve a esconder si el admin cambia de pestaña y vuelve.
 *
 * `fotosActuales` también dispara un refetch cuando cambia (ver el segundo
 * efecto): el flujo previsto para regenerar es sacar del producto las fotos
 * adoptadas que se estén usando y recién después borrar las generadas, y sin
 * este refetch esta lista seguía marcando esa imagen "ya en la ficha" para
 * siempre, aunque ya no lo estuviera.
 *
 * Esa dependencia NO es `fotosActuales` en sí (la identidad del array): el
 * reducer de `useProductoForm` despacha un array nuevo ante CUALQUIER
 * mutación de fotos, reordenar una galería de 10 incluido, y eso disparaba un
 * refetch por cada reorden — la misma cuota de la Admin API que el diferido
 * de arriba existe para proteger. La dependencia real es `firmaIdsFotos`, una
 * firma estable armada con los ids persistidos (ordenados, así que reordenar
 * NO cambia la firma): solo cambia cuando el CONJUNTO de fotos persistidas
 * cambia — agregar, sacar o reemplazar una —, que es lo único que puede
 * alterar qué imagen generada ya está "en uso".
 */
function GaleriaGeneradas({ productoId, fotosActuales = [], onAdoptadas, visible = true }) {
  const [imagenes, setImagenes] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  // Arranca en `visible`: si el componente ya nace visible (caso común de un
  // uso directo sin pestañas), no tiene sentido diferir la primera carga.
  const [haSidoVisible, setHaSidoVisible] = useState(visible);
  // Se pone en `true` recién cuando la PRIMERA carga terminó (con éxito o con
  // error) — es lo que distingue esa carga inicial (bloquea todo el bloque
  // con el spinner de abajo) de un refetch en segundo plano (no debe
  // colapsar una galería que ya está en pantalla a "Buscando…").
  const primeraCargaHechaRef = useRef(false);

  const libres = MAX_FOTOS - fotosActuales.length;
  const excede = seleccion.length > libres;

  // Firma estable de qué fotos persistidas tiene el producto ahora mismo. Las
  // locales sin subir (`file`, sin id numérico) se excluyen a propósito: no
  // tienen `cloudinaryPublicId`, así que no pueden estar "en uso" del lado del
  // backend y no deberían disparar un refetch.
  const firmaIdsFotos = fotosActuales
    .filter((f) => typeof f.id === "number")
    .map((f) => f.id)
    .sort((a, b) => a - b)
    .join(",");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { imagenes: recibidas } = await getImagenesGeneradas(productoId);
      setImagenes(recibidas);
      // Filtra en vez de vaciar: con el refetch nuevo disparado por
      // `firmaIdsFotos` (ver el efecto de abajo), un cambio de fotos AJENO a
      // esta galería —agregar una foto en el bloque 1, por ejemplo— no tiene
      // por qué tirar a la basura una selección que el admin ya hizo acá. Solo
      // se descartan los publicId que ya no están en la respuesta o que ahora
      // figuran adoptados (alguien más los adoptó mientras tanto).
      setSeleccion((actual) => {
        const disponibles = new Set(
          recibidas.filter((imagen) => !imagen.adoptada).map((imagen) => imagen.publicId),
        );
        return actual.filter((publicId) => disponibles.has(publicId));
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      primeraCargaHechaRef.current = true;
    }
  }, [productoId]);

  useEffect(() => {
    if (visible) setHaSidoVisible(true);
  }, [visible]);

  useEffect(() => {
    if (!haSidoVisible) return;
    cargar();
    // La dependencia es la FIRMA, no `fotosActuales`: ver el comentario de
    // cabecera. No realimenta más allá de la llamada de más ya aceptada:
    // `cargar()` solo toca estado local (`imagenes`/`seleccion`), nunca las
    // fotos del producto.
  }, [haSidoVisible, cargar, firmaIdsFotos]);

  function alternar(publicId) {
    setAviso("");
    setSeleccion((actual) =>
      actual.includes(publicId) ? actual.filter((id) => id !== publicId) : [...actual, publicId],
    );
  }

  async function handleAdoptar() {
    setTrabajando(true);
    setError("");
    setAviso("");
    try {
      const { agregadas } = await adoptarImagenesGeneradas(productoId, seleccion);
      // Se espera el resultado del refresco del padre (`useProductoForm.
      // refrescarFotos`) para saber si falló: adoptar ya creó la fila `Foto`
      // en el servidor en la línea de arriba, así que un fallo mudo acá deja
      // la vista sin la foto recién adoptada — y el próximo Guardar la
      // borraría de Cloudinary, creyendo que el admin la sacó. El silencio no
      // es opción: si `refrescoOk` es `false`, se avisa en el mismo `aviso`
      // que ya usa el camino feliz, en vez de sumar un componente nuevo.
      const refrescoOk = await onAdoptadas?.();
      const base = `Se ${agregadas === 1 ? "agregó 1 foto" : `agregaron ${agregadas} fotos`} a la ficha.`;
      setAviso(
        refrescoOk === false
          ? `${base} Pero no pude actualizar la vista: recargá la página antes de guardar.`
          : base,
      );
      setSeleccion([]);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  }

  async function handleBorrar() {
    setTrabajando(true);
    setError("");
    setAviso("");
    try {
      const { borradas, conservadas, carpetaBorrada } = await borrarImagenesGeneradas(productoId);
      setAviso(
        conservadas > 0
          ? `Se borraron ${borradas}. Se conservaron ${conservadas} porque están en uso en la ficha: para volver a generar, quitalas primero del producto.`
          : `Se borraron ${borradas} imágenes${carpetaBorrada ? " y la carpeta" : ""}. Ya podés generar de nuevo.`,
      );
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  }

  // El spinner de bloque completo es SOLO para la primera carga: bloquearla
  // entera está bien cuando todavía no hay nada que mostrar. Un refetch en
  // segundo plano (disparado por `firmaIdsFotos`, ver cabecera) con la
  // galería ya en pantalla usa el indicador discreto de más abajo — colapsar
  // todo el bloque a "Buscando…" en cada clic del bloque 1 sería peor que no
  // avisar nada.
  if (cargando && !primeraCargaHechaRef.current) {
    return (
      <p className="font-body-md text-body-md flex items-center gap-2 text-on-surface-variant">
        <Spinner className="h-4 w-4" /> Buscando imágenes generadas…
      </p>
    );
  }

  return (
    <div>
      {cargando ? (
        <p className="font-body-md text-body-md mb-3 flex items-center gap-2 text-on-surface-variant">
          <Spinner className="h-3 w-3" /> Actualizando…
        </p>
      ) : null}

      {/* `!cargando` es necesario, no cosmético: si la carga anterior falló
          (`error` seteado) y un refetch en segundo plano arranca, `cargar()`
          limpia `error` de entrada, así que sin este chequeo la pantalla
          afirmaría "no hay nada" mientras la respuesta todavía no llegó — la
          misma distinción entre "falló la carga" y "no hay nada" que exige
          CLAUDE.md para toda pantalla que hace fetch. */}
      {imagenes.length === 0 && !error && !cargando ? (
        <div className="rounded-lg border border-dashed border-outline p-8 text-center">
          <span className="material-symbols-outlined text-[34px] text-outline">auto_awesome</span>
          <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
            Todavía no hay imágenes generadas para este producto.
          </p>
        </div>
      ) : null}

      {imagenes.length > 0 ? (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {imagenes.map((imagen) => {
              const elegida = seleccion.includes(imagen.publicId);
              return (
                <li key={imagen.publicId}>
                  <button
                    type="button"
                    aria-pressed={elegida}
                    disabled={imagen.adoptada}
                    onClick={() => alternar(imagen.publicId)}
                    className={`block w-full rounded-lg text-left ${elegida ? "ring-2 ring-primary" : ""} ${
                      imagen.adoptada ? "opacity-60" : ""
                    }`}
                  >
                    {/* `absolute inset-0`: un <img> en flujo normal dentro de una
                        caja con aspect ratio estira la caja al ratio del archivo
                        (ver CLAUDE.md, "Grid del catálogo público"). */}
                    <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-container-high">
                      <img
                        src={imagen.url}
                        alt={imagen.nombre}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </span>
                    <span className="font-label-sm text-label-sm mt-1 block text-center text-on-surface-variant">
                      {imagen.nombre}
                      {imagen.adoptada ? " · ya en la ficha" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <span className="font-body-md text-body-md text-on-surface-variant">
              <strong className="text-on-surface">{seleccion.length}</strong> seleccionadas ·{" "}
              {libres === 0 ? "la ficha ya tiene 10 fotos" : `entran ${libres} más`}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBorrar}
                disabled={trabajando}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span> Borrar generadas
              </button>
              <button
                type="button"
                onClick={handleAdoptar}
                disabled={trabajando || excede || seleccion.length === 0}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 uppercase tracking-widest text-on-primary disabled:opacity-60"
              >
                {trabajando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
                Agregar a la ficha
              </button>
            </div>
          </div>
        </>
      ) : null}

      {excede ? (
        <p
          role="alert"
          className="font-body-md text-body-md mt-3 rounded-lg bg-error-container px-4 py-3 text-on-error-container"
        >
          Elegiste {seleccion.length} y solo {libres === 1 ? "entra 1" : `entran ${libres}`}. Quitá
          alguna de la selección o sacá fotos de la ficha.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="font-body-md text-body-md mt-3 rounded-lg bg-error-container px-4 py-3 text-on-error-container"
        >
          {error}
        </p>
      ) : null}

      {aviso ? (
        <p role="status" className="font-body-md text-body-md mt-3 text-secondary">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}

export default GaleriaGeneradas;
