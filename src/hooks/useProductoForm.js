import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, deletePhoto, getProductById, updateProduct } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";
import { formatearPrecioInput, formatearPrecioParaEdicion } from "../utils/formato.js";
import { nuevoIdTemporal } from "../utils/idTemporal.js";
import useGuardaSalida from "./useGuardaSalida.js";

/**
 * Estado editable del producto, en un único objeto.
 *
 * Antes eran dos docenas de `useState` escalares y el mismo producto se
 * rearmaba a mano en tres lugares (carga, vista previa y submit). Agregar un
 * campo obligaba a tocar cinco puntos distintos, y olvidarse de la lista de
 * dependencias de la vista previa la dejaba sin actualizarse en silencio, sin
 * error ni aviso.
 *
 * `sku`, `visibleEnCatalogo` y `destacado` viven acá aunque sean de
 * solo lectura: son parte del producto cargado y se muestran en el editor,
 * pero se editan en el listado, que los guarda al instante vía PATCH — un
 * `PUT` desde este formulario pisaría un toggle recién cambiado ahí.
 */
const VALORES_INICIALES = {
  id: null,
  nombre: "",
  descripcion: "",
  precio: "",
  precioVisual: "",
  // Costo de adquisición y coeficiente. El precio NO se deriva de ellos acá:
  // se calculan y se aplican desde `/catalogo/admin/productos/precios`. Este
  // formulario solo los guarda, igual que cualquier otro campo del producto.
  costo: "",
  coeficiente: "",
  etiqueta: "",
  categoriaId: "",
  stock: "0",
  fraseComercial: "",
  porQueLoVasAQuerer: "",
  tePasaEsto: "",
  beneficios: [],
  usos: [],
  idealPara: [],
  incluye: [],
  especificaciones: [],
  caracteristicas: [],
  fotos: [],
  video: null,
  sku: null,
  visibleEnCatalogo: true,
  destacado: false,
};

/**
 * Único punto donde se transforma el estado editable del producto.
 *
 * `cargar` devuelve un objeto nuevo entero, no un spread del anterior: mapea
 * todos los campos del producto traído del backend, así que no queda nada de
 * una carga previa.
 */
function reducirValores(valores, accion) {
  switch (accion.tipo) {
    case "cargar": {
      const { producto } = accion;
      const { crudo, formateado } = producto.precio
        ? formatearPrecioParaEdicion(String(producto.precio))
        : { crudo: "", formateado: "" };

      return {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? "",
        precio: crudo,
        precioVisual: formateado,
        costo: producto.costo ?? "",
        coeficiente: producto.coeficiente ?? "",
        etiqueta: producto.etiqueta ?? "",
        categoriaId: producto.categoria?.id ? String(producto.categoria.id) : "",
        stock: String(producto.stock ?? 0),
        fraseComercial: producto.fraseComercial ?? "",
        porQueLoVasAQuerer: producto.porQueLoVasAQuerer ?? "",
        tePasaEsto: producto.tePasaEsto ?? "",
        beneficios: producto.beneficios ?? [],
        usos: producto.usos ?? [],
        idealPara: producto.idealPara ?? [],
        incluye: producto.incluye ?? [],
        especificaciones: producto.especificaciones ?? [],
        caracteristicas: producto.caracteristicas ?? [],
        fotos: producto.fotos ?? [],
        video: producto.video ?? null,
        sku: producto.sku ?? null,
        visibleEnCatalogo: producto.visibleEnCatalogo ?? true,
        destacado: producto.destacado ?? false,
      };
    }

    case "campo":
      return { ...valores, [accion.campo]: accion.valor };

    // Precio y precio visual son dos vistas del mismo dato y siempre se
    // escriben juntos: separarlos deja el formateado desfasado del crudo.
    case "precio":
      return { ...valores, precio: accion.crudo, precioVisual: accion.formateado };

    case "agregarItem":
      return { ...valores, [accion.campo]: [...valores[accion.campo], accion.item] };

    case "eliminarItem":
      return {
        ...valores,
        [accion.campo]: valores[accion.campo].filter((_, i) => i !== accion.index),
      };

    default:
      return valores;
  }
}

/**
 * The shape `FichaProducto` expects, built from form state. Photos already
 * carry a usable `url` (persisted ones from the API, freshly picked ones
 * from `URL.createObjectURL` inside MediaUploader), so the preview shows
 * not-yet-uploaded images with no extra work.
 *
 * Es una función pura de `valores`, así que la vista previa depende de un
 * único valor y no puede quedar desincronizada por una dependencia olvidada.
 */
function construirProductoPreview(valores) {
  return {
    id: valores.id,
    nombre: valores.nombre,
    descripcion: valores.descripcion,
    precio: valores.precio,
    etiqueta: valores.etiqueta.trim() === "" ? null : valores.etiqueta.trim(),
    stock: valores.stock === "" ? 0 : Number(valores.stock),
    fraseComercial: valores.fraseComercial.trim() === "" ? null : valores.fraseComercial.trim(),
    porQueLoVasAQuerer:
      valores.porQueLoVasAQuerer.trim() === "" ? null : valores.porQueLoVasAQuerer.trim(),
    tePasaEsto: valores.tePasaEsto.trim() === "" ? null : valores.tePasaEsto.trim(),
    beneficios: valores.beneficios,
    usos: valores.usos,
    idealPara: valores.idealPara,
    incluye: valores.incluye,
    especificaciones: valores.especificaciones,
    caracteristicas: valores.caracteristicas,
    fotos: valores.fotos,
    video: valores.video,
    relacionados: [],
  };
}

/** El cuerpo que reciben `createProduct` / `updateProduct`, también puro. */
function construirPayload(valores) {
  return {
    nombre: valores.nombre,
    descripcion: valores.descripcion,
    precio: valores.precio,
    // Se mandan siempre, incluso vacíos: `""` le dice al backend que BORRE la
    // columna. Omitirlos dejaría un costo cargado por error pegado para siempre.
    costo: valores.costo,
    coeficiente: valores.coeficiente,
    categoriaId: valores.categoriaId === "" ? null : valores.categoriaId,
    etiqueta: valores.etiqueta.trim() === "" ? null : valores.etiqueta.trim(),
    stock: valores.stock,
    fraseComercial: valores.fraseComercial.trim() === "" ? null : valores.fraseComercial.trim(),
    porQueLoVasAQuerer:
      valores.porQueLoVasAQuerer.trim() === "" ? null : valores.porQueLoVasAQuerer.trim(),
    tePasaEsto: valores.tePasaEsto.trim() === "" ? null : valores.tePasaEsto.trim(),
    beneficios: valores.beneficios.map((b) => ({ texto: b.texto })),
    usos: valores.usos.map((u) => ({ texto: u.texto })),
    idealPara: valores.idealPara.map((i) => ({ texto: i.texto })),
    incluye: valores.incluye.map((i) => ({ texto: i.texto })),
    especificaciones: valores.especificaciones.map((e) => ({ nombre: e.nombre, valor: e.valor })),
    caracteristicas: valores.caracteristicas.map((c) => ({ texto: c.texto })),
    // Persisted photos (numeric id, no local `file`) are referenced by id
    // so the backend keeps them as-is; freshly picked photos (`f.file`
    // set by MediaUploader) are sent as real bytes for a new upload.
    fotosExistentes: valores.fotos
      .filter((f) => typeof f.id === "number" && !f.file)
      .map((f) => f.id),
    fotosNuevas: valores.fotos.filter((f) => f.file).map((f) => f.file),
    // La secuencia final, en el orden real del array. `fotosExistentes` sola
    // no alcanza: dice qué fotos sobreviven, no en qué posición, y el backend
    // dejaría las nuevas al final. La posición 0 es la portada y la 1 es la
    // imagen de "¿Qué problema resuelve?", así que el orden es contenido.
    ordenFotos: valores.fotos.reduce((acc, f) => {
      if (f.file) {
        // El índice tiene que coincidir con la posición en `fotosNuevas`,
        // que se arma con el mismo filtro y conserva este mismo orden.
        acc.push({ tipo: "nueva", index: acc.filter((t) => t.tipo === "nueva").length });
      } else {
        acc.push({ tipo: "existente", id: f.id });
      }
      return acc;
    }, []),
    // `video` is null (removed by the user) vs. unchanged (persisted,
    // no `file`) vs. replaced (`file` set) — three distinct states the
    // backend needs disambiguated via `eliminarVideo`.
    videoNuevo: valores.video?.file ?? null,
    eliminarVideo: !valores.video,
  };
}

/**
 * Mergea las fotos que trae el servidor (tras adoptar una imagen generada) con
 * las locales todavía no subidas — POR POSICIÓN, nunca concatenando.
 *
 * Concatenar (servidor primero, locales después) pierde un REEMPLAZO: si
 * `MediaUploader.ponerEn` cambió la portada o la imagen de "¿Qué problema
 * resuelve?" in situ, ese id ya no aparece en `valoresFotos` — pero el
 * servidor todavía lo tiene, porque el reemplazo recién se persiste en el
 * submit (manda `ordenFotos`, que es lo que borra la vieja). Concatenar la
 * resucita en la posición 0 y manda a la local al final, invirtiendo justo lo
 * que el admin acaba de hacer — y con el badge de cambios sin guardar
 * apagado, "Guardar" persistiría el orden del servidor pisando el reemplazo.
 *
 * El merge recorre `valoresFotos` EN ORDEN preservando cada posición tal
 * cual: una entrada local (`file`) queda exactamente donde está, una
 * persistida se actualiza con su versión del servidor si sigue existiendo, o
 * se descarta si ya no está (baja externa). Las fotos recién adoptadas (en el
 * servidor, nunca vistas en este formulario) se anexan LITERAL al final del
 * array resultante — sin ninguna heurística que intente "colarlas" antes de
 * una corrida de locales sin subir.
 *
 * Esa heurística existió en una primera versión (cortar el array donde
 * empezaba la corrida final de locales, e insertar ahí) y se sacó a
 * propósito: confundía un REEMPLAZO con un simple append apenas ese
 * reemplazo quedaba último en `valoresFotos` — que es exactamente lo que pasa
 * al reemplazar la imagen de "¿Qué problema resuelve?" en un producto de dos
 * fotos, o la portada en un producto de una sola. En los dos casos la local
 * terminaba corrida y la recién adoptada le robaba la posición semántica
 * (portada incluida). Anexar sin heurística no tiene ese modo de falla: cada
 * entrada de `valoresFotos` conserva su posición pase lo que pase, y lo único
 * que se decide es DÓNDE va lo nuevo (siempre al final, nunca antes).
 *
 * `idsConocidos` (ids vistos en la carga inicial o en un refresco anterior)
 * es lo que distingue "recién adoptada" (nunca vista) de "conocida pero ya no
 * referenciada" (reemplazada localmente): sin este set, una foto reemplazada
 * y todavía viva en el servidor volvería a aparecer al final del array — el
 * mismo bug que este merge existe para evitar, solo que en otra posición.
 */
export function fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos) {
  const porIdServidor = new Map(fotosServidor.map((f) => [f.id, f]));
  const vistos = new Set();

  const fusionado = [];
  for (const foto of valoresFotos) {
    if (foto.file) {
      fusionado.push(foto);
      continue;
    }
    const delServidor = porIdServidor.get(foto.id);
    if (delServidor) {
      fusionado.push(delServidor);
      vistos.add(foto.id);
    }
    // Si ya no está en el servidor, se descarta: baja externa al producto.
  }

  const recienAdoptadas = fotosServidor.filter(
    (f) => !vistos.has(f.id) && !idsConocidos.has(f.id),
  );

  return [...fusionado, ...recienAdoptadas];
}

/**
 * Todo el estado y el comportamiento del editor de producto del admin: carga,
 * edición, vista previa, guardado y guarda de salida. Lo que queda afuera es
 * puramente visual (qué panel se ve, ancho del preview, plantilla completa),
 * porque no tiene nada que ver con el producto.
 *
 * Modo alta vs. edición se deduce del parámetro `:id` de la ruta:
 *   - `/catalogo/admin/productos/nuevo`        -> alta (sin `:id`)
 *   - `/catalogo/admin/productos/:id/editar`   -> edición (precarga con getProductById)
 */
export default function useProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [cargando, setCargando] = useState(esEdicion);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  // Aparte de `error`: que no carguen las categorías degrada un campo opcional,
  // no impide guardar el producto — merece un aviso propio, no el error general.
  const [errorCategorias, setErrorCategorias] = useState(null);
  // Falla al traer el producto a editar: bloquea la pantalla entera, a
  // diferencia de `error` (fallo al guardar, con el form ya cargado).
  const [errorCarga, setErrorCarga] = useState(null);
  const [sucio, setSucio] = useState(false);
  const confirmarSalida = useGuardaSalida(sucio);

  const [valores, despachar] = useReducer(reducirValores, VALORES_INICIALES);

  // Ids de fotos que este formulario ya conoció (carga inicial + cada
  // refresco posterior). `fusionarFotosPorPosicion` lo usa para distinguir una
  // foto recién adoptada (nunca vista) de una conocida pero reemplazada
  // localmente (no debe resucitar). Vive en un ref, no en el reducer: no es
  // dato del producto que se envíe en ningún payload.
  const idsFotosConocidasRef = useRef(new Set());

  // Fuera del reducer a propósito: las categorías no son parte del producto,
  // se traen aparte y no se envían en el submit.
  const [categorias, setCategorias] = useState([]);

  // Borradores de los campos "agregar": no son parte del producto hasta que
  // se confirman, así que no viven en `valores`.
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState("");
  const [nuevaSpecNombre, setNuevaSpecNombre] = useState("");
  const [nuevaSpecValor, setNuevaSpecValor] = useState("");

  useEffect(() => {
    if (!esEdicion) return;

    let activo = true;
    setCargando(true);

    getProductById(id, { admin: true })
      .then((producto) => {
        if (!activo) return;

        if (!producto) {
          setNoEncontrado(true);
          setCargando(false);
          return;
        }

        despachar({ tipo: "cargar", producto });
        idsFotosConocidasRef.current = new Set(producto.fotos.map((f) => f.id));
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y la pantalla en blanco. Preferimos un error visible sobre un spinner
      // eterno: el admin necesita saber que el problema es la conexión.
      .catch(() => {
        if (!activo) return;
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id, esEdicion]);

  /**
   * Refresca SOLO las fotos del producto contra el servidor — nada de nombre,
   * precio, descripción ni el resto. La usa la solapa Imágenes cuando se
   * adoptan imágenes generadas: adoptar crea filas `Foto` del lado del
   * servidor, así que el uploader necesita verlas, pero eso no es motivo para
   * recargar el producto entero.
   *
   * Deliberadamente NO hace lo que hacía la primera versión de esta función
   * (recargar todo con `cargando`/`cargar`): ese camino reusaba el mismo flag
   * que dispara el spinner de página completa en `AdminProductoForm`
   * (desmontaría el editor entero al volver de adoptar) y pisaba `valores`
   * entero con el snapshot del servidor — perdiendo en silencio cualquier foto
   * recién arrastrada en la solapa que todavía no se subió, y sin tocar
   * `sucio`, dejando la guarda de salida mintiendo sobre qué había pendiente.
   *
   * Por eso: no toca `cargando` (sin spinner global), despacha solo el campo
   * `fotos` (nunca `cargar`), y MERGEA por posición vía
   * `fusionarFotosPorPosicion` en vez de concatenar — ver su docstring para el
   * porqué (concatenar resucita una foto reemplazada). Tampoco toca `sucio`:
   * adoptar imágenes no vuelve "guardado" un cambio pendiente que ya estaba,
   * ni inventa uno donde no había.
   *
   * Devuelve `true`/`false` para que quien la llama (`GaleriaGeneradas`) sepa
   * si el refresco falló: adoptar ya creó la fila `Foto` en el servidor
   * ANTES de llamar acá, así que un fallo de este `fetch` deja `valores.fotos`
   * sin la recién adoptada — y el próximo Guardar la borraría de Cloudinary
   * (el backend interpreta "no vino en el payload" como "sacala"). El
   * silencio total ya no es opción: la Galería necesita poder avisar.
   */
  const refrescarFotos = useCallback(async () => {
    try {
      const producto = await getProductById(id, { admin: true });
      if (!producto) return false;

      const merged = fusionarFotosPorPosicion(
        valores.fotos,
        producto.fotos,
        idsFotosConocidasRef.current,
      );
      idsFotosConocidasRef.current = new Set(producto.fotos.map((f) => f.id));

      despachar({ tipo: "campo", campo: "fotos", valor: merged });
      return true;
    } catch {
      // A diferencia de la versión anterior, esto YA NO es un fallo mudo: se
      // reporta `false` para que `GaleriaGeneradas` avise que lo que se ve en
      // pantalla puede no reflejar lo que hay realmente en el servidor.
      return false;
    }
  }, [id, valores.fotos]);

  useEffect(() => {
    let activo = true;
    getCategorias()
      .then((data) => {
        if (activo) setCategorias(data);
      })
      // Falla blanda, mismo criterio que `Coleccion.jsx`: el desplegable queda
      // sin opciones pero el resto del formulario sigue siendo usable, así que
      // se avisa aparte en vez de bloquear la carga entera.
      .catch(() => {
        if (activo) setErrorCategorias("No se pudieron cargar las categorías.");
      });
    return () => {
      activo = false;
    };
  }, []);

  /**
   * Wraps a field update so any edit also flags the form dirty. With a preview
   * this convincing, an admin can easily believe a change is already saved —
   * the header badge is the counterweight.
   */
  function editar(campo) {
    return (valor) => {
      setSucio(true);
      despachar({ tipo: "campo", campo, valor });
    };
  }

  /** El precio se escribe formateado y se guarda crudo: siempre van juntos. */
  function editarPrecio(entrada) {
    const { formateado, crudo } = formatearPrecioInput(entrada);
    setSucio(true);
    despachar({ tipo: "precio", crudo, formateado });
  }

  const productoPreview = useMemo(() => construirProductoPreview(valores), [valores]);

  function agregarCaracteristica() {
    const texto = nuevaCaracteristica.trim();
    if (!texto) return;
    setSucio(true);
    despachar({
      tipo: "agregarItem",
      campo: "caracteristicas",
      item: { id: nuevoIdTemporal(), texto },
    });
    setNuevaCaracteristica("");
  }

  function eliminarCaracteristica(index) {
    setSucio(true);
    despachar({ tipo: "eliminarItem", campo: "caracteristicas", index });
  }

  function agregarEspecificacion() {
    const nombreSpec = nuevaSpecNombre.trim();
    const valorSpec = nuevaSpecValor.trim();
    if (!nombreSpec || !valorSpec) return;
    setSucio(true);
    despachar({
      tipo: "agregarItem",
      campo: "especificaciones",
      item: { id: nuevoIdTemporal(), nombre: nombreSpec, valor: valorSpec },
    });
    setNuevaSpecNombre("");
    setNuevaSpecValor("");
  }

  function eliminarEspecificacion(index) {
    setSucio(true);
    despachar({ tipo: "eliminarItem", campo: "especificaciones", index });
  }

  /**
   * `MediaUploader` owns the per-photo remove button and reports the next
   * `fotos` array via `onChangeFotos`. This wrapper diffs against the current
   * state: if a removed photo was already persisted (numeric id from the
   * store), it's deleted via `deletePhoto` immediately so `orden` stays
   * re-normalized server-side. Freshly added, not-yet-saved photos
   * (client-generated preview, no numeric id) are only dropped from local
   * state.
   *
   * Baja y reemplazo se distinguen por la longitud del array, no por el id
   * que falta: reemplazar la portada también saca el id viejo del listado,
   * pero deja otra foto en su lugar. Tratar eso como baja borraba la foto en
   * el servidor y descartaba el archivo recién elegido, todo de una. Un
   * reemplazo se persiste en el `PUT` del submit, que manda `ordenFotos` y ya
   * borra ahí la foto que quedó fuera de la secuencia.
   */
  async function handleChangeFotos(siguientesFotos) {
    const { fotos, id: productoId } = valores;
    const idsRestantes = new Set(siguientesFotos.map((f) => f.id));
    const eliminada = fotos.find((f) => typeof f.id === "number" && !idsRestantes.has(f.id));
    const esReemplazo = siguientesFotos.length === fotos.length;

    if (esEdicion && productoId && eliminada && !esReemplazo) {
      try {
        const actualizado = await deletePhoto(productoId, eliminada.id);
        // Sin `setSucio(true)`: el borrado ya quedó guardado en el servidor,
        // así que no hay nada pendiente que avisar al salir del editor.
        despachar({ tipo: "campo", campo: "fotos", valor: actualizado.fotos });
        return;
      } catch (err) {
        setError(err.message ?? "No se pudo eliminar la foto.");
        return;
      }
    }

    setSucio(true);
    despachar({ tipo: "campo", campo: "fotos", valor: siguientesFotos });
  }

  function salirDelEditor() {
    if (!confirmarSalida()) return;
    navigate("/catalogo/admin/productos");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // Guarda de reentrada: el botón Guardar se deshabilita solo, pero Enter en
    // cualquier input dispara el submit nativo del <form> igual. Sin esto, dos
    // POST concurrentes en un alta crean el producto (y sus fotos en
    // Cloudinary) por duplicado.
    if (guardando) return;
    setError(null);
    setGuardando(true);

    const data = construirPayload(valores);

    try {
      if (esEdicion) {
        await updateProduct(valores.id, data);
      } else {
        await createProduct(data);
      }
      setSucio(false);
      navigate("/catalogo/admin/productos");
    } catch (err) {
      setError(err.message ?? "No se pudo guardar el producto.");
      setGuardando(false);
    }
  }

  return {
    esEdicion,
    cargando,
    noEncontrado,
    errorCarga,
    guardando,
    error,
    errorCategorias,
    sucio,
    valores,
    categorias,
    productoPreview,
    // Agrupados: los tres campos "agregar" son un mismo tipo de estado y
    // viajan juntos al formulario, no sueltos entre las acciones.
    borradores: {
      nuevaCaracteristica,
      setNuevaCaracteristica,
      nuevaSpecNombre,
      setNuevaSpecNombre,
      nuevaSpecValor,
      setNuevaSpecValor,
    },
    editar,
    editarPrecio,
    agregarCaracteristica,
    eliminarCaracteristica,
    agregarEspecificacion,
    eliminarEspecificacion,
    handleChangeFotos,
    handleSubmit,
    confirmarSalida,
    salirDelEditor,
    refrescarFotos,
  };
}
