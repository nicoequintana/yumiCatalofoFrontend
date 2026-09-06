import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  actualizarCampania,
  cambiarEstadoCampania,
  crearCampania,
  duplicarCampania,
  eliminarCampania,
  getCampania,
  getContadorCampania,
  getOpcionesCampania,
  guardarProductosDeCampania,
  guardarPromocionesDeCampania,
  quitarArte,
  quitarDoodle,
  subirArte,
  subirDoodle,
} from "../api/campanias.js";
import { getPromociones } from "../api/promociones.js";
import useGuardaSalida from "./useGuardaSalida.js";
import { DEBOUNCE_BUSQUEDA_MS } from "./useTablaAdmin.js";

/**
 * Todo el estado y el comportamiento del editor de campaña.
 *
 * Modo alta vs. edición se deduce del parámetro `:id` de la ruta, igual que
 * `useProductoForm`:
 *   - `/catalogo/admin/campanias/nueva`        -> alta (sin `:id`)
 *   - `/catalogo/admin/campanias/:id/editar`   -> edición (precarga con getCampania)
 *
 * LO QUE SE GUARDA CON EL FORMULARIO y lo que NO. El `<form>` manda la campaña
 * (nombre, fechas, cartel). El Doodle, la vitrina y las promociones tienen
 * endpoint propio y se persisten en el acto: no participan de `sucio` ni del
 * submit. Por eso las tres solo existen en edición — no se le puede subir una
 * imagen ni asociar un producto a algo que todavía no tiene id.
 */

/** Los dos destinos del CTA que apuntan a UNA fila y por eso exigen su id. */
const DESTINOS_CON_REFERENCIA = ["CATEGORIA", "PRODUCTO"];

/**
 * El estado del formulario a partir de la campaña cargada (o del día que se
 * tocó en el calendario, en un alta).
 *
 * `modalCtaTipo` vacío es "Sin botón", y es un estado legítimo: una campaña
 * puede querer avisar algo sin mandar a ningún lado.
 */
function valoresIniciales(campania, diaElegido) {
  return {
    nombre: campania?.nombre ?? "",
    descripcion: campania?.descripcion ?? "",
    // Se completa cuando llegan las opciones: el default es la PRIMERA que
    // manda el backend, nunca una constante local.
    tipo: campania?.tipo ?? "",
    estado: campania?.estado ?? "BORRADOR",
    desde: campania?.desde ?? diaElegido ?? "",
    hasta: campania?.hasta ?? diaElegido ?? "",
    prioridad: String(campania?.prioridad ?? 0),
    doodleEnCatalogo: campania?.doodleEnCatalogo ?? true,
    doodleEnAdmin: campania?.doodleEnAdmin ?? false,
    modalActivo: campania?.modalActivo ?? false,
    modalTitulo: campania?.modalTitulo ?? "",
    modalTexto: campania?.modalTexto ?? "",
    modalCtaTexto: campania?.modalCtaTexto ?? "",
    modalCtaTipo: campania?.modalCtaTipo ?? "",
    modalCtaReferenciaId: campania?.modalCtaReferenciaId
      ? String(campania.modalCtaReferenciaId)
      : "",
    modalFechaObjetivo: campania?.modalFechaObjetivo ?? "",
    bannerEnHome: campania?.bannerEnHome ?? false,
    bannerTitulo: campania?.bannerTitulo ?? "",
    bannerTexto: campania?.bannerTexto ?? "",
  };
}

/** El cuerpo que reciben `crearCampania` / `actualizarCampania`. Función pura. */
function construirPayload(valores) {
  const tipoCta = valores.modalCtaTipo || null;

  return {
    nombre: valores.nombre.trim(),
    // Los vacíos van como null: el backend los trata como "sin valor", y mandar
    // "" guardaría una cadena vacía que después hay que distinguir de no haber
    // cargado nada.
    descripcion: valores.descripcion.trim() || null,
    tipo: valores.tipo,
    estado: valores.estado,
    desde: valores.desde,
    hasta: valores.hasta,
    prioridad: Number(valores.prioridad) || 0,
    doodleEnCatalogo: valores.doodleEnCatalogo,
    doodleEnAdmin: valores.doodleEnAdmin,
    modalActivo: valores.modalActivo,
    modalTitulo: valores.modalTitulo.trim() || null,
    modalTexto: valores.modalTexto.trim() || null,
    modalCtaTexto: valores.modalCtaTexto.trim() || null,
    modalCtaTipo: tipoCta,
    // La referencia solo viaja con los destinos que la usan: dejarla puesta al
    // cambiar de "Una categoría" a "Todo el catálogo" guardaría un id que ya no
    // significa nada.
    modalCtaReferenciaId: DESTINOS_CON_REFERENCIA.includes(tipoCta)
      ? Number(valores.modalCtaReferenciaId)
      : null,
    modalFechaObjetivo: valores.modalFechaObjetivo || null,
    bannerEnHome: valores.bannerEnHome,
    // Vacíos como null, mismo criterio que los del cartel: "" guardaría una
    // cadena vacía que después hay que distinguir de no haber cargado nada.
    bannerTitulo: valores.bannerTitulo.trim() || null,
    bannerTexto: valores.bannerTexto.trim() || null,
    // `bannerCtaTexto` y `bannerColor` NO viajan: dejaron de ser editables el
    // 06/09/2026 y sus columnas quedaron inertes. Volver a listarlas acá las
    // reescribiría desde una pantalla que ya no las muestra.
  };
}

export default function useCampaniaEditor() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  const diaElegido = parametros.get("dia");

  const [opciones, setOpciones] = useState(null);
  const [campania, setCampania] = useState(null);
  const [promociones, setPromociones] = useState([]);
  const [valores, setValores] = useState(() => valoresIniciales(null, diaElegido));
  const [diasFaltantes, setDiasFaltantes] = useState(null);

  const [cargando, setCargando] = useState(esEdicion);
  const [errorCarga, setErrorCarga] = useState(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  // Estado propio del borrado, separado de `guardando`/`error`: son dos
  // operaciones distintas, y sobre todo se muestran en LUGARES distintos. El
  // error general se pinta en la página; el del borrado tiene que verse dentro
  // del diálogo, que la tapa con su velo. Mismo reparto que `useProductoForm`.
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);
  // Mismo reparto, por el mismo motivo: la vitrina y las promociones son las
  // secciones 3 y 4, DESPUÉS de un formulario de ~1.686 px. Su error pintado en
  // el bloque general —arriba de todo, antes del `<form>`— existe y está bien
  // calculado, pero queda fuera del viewport de quien apretó el botón: se lee
  // como un botón que no hace nada, y el admin lo vuelve a apretar.
  const [errorProductos, setErrorProductos] = useState(null);
  const [errorPromociones, setErrorPromociones] = useState(null);
  const [sucio, setSucio] = useState(false);
  const confirmarSalida = useGuardaSalida(sucio);

  useEffect(() => {
    let activo = true;
    getOpcionesCampania()
      .then((datos) => {
        if (activo) setOpciones(datos);
      })
      .catch((err) => {
        if (activo) setErrorCarga(err.message);
      });
    return () => {
      activo = false;
    };
  }, []);

  // Las promociones son la lista COMPLETA del panel, no las de esta campaña:
  // los checkboxes ofrecen todas y marcan las asociadas. Falla blanda — sin
  // ellas el resto del editor sigue siendo usable.
  useEffect(() => {
    if (!esEdicion) return undefined;
    let activo = true;
    getPromociones()
      .then((datos) => {
        if (activo) setPromociones(datos);
      })
      .catch(() => {
        if (activo) setPromociones([]);
      });
    return () => {
      activo = false;
    };
  }, [esEdicion]);

  useEffect(() => {
    if (!esEdicion) return undefined;
    let activo = true;
    setCargando(true);

    getCampania(id)
      .then((detalle) => {
        if (!activo) return;
        setCampania(detalle);
        setValores(valoresIniciales(detalle, null));
        // Lo cargado del servidor no es un cambio pendiente.
        setSucio(false);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa sin manejar y la
      // pantalla en blanco. Y el formulario vacío sería peor que un error: haría
      // creer que la campaña se quedó sin datos, y guardarla los borraría.
      .catch((err) => {
        if (!activo) return;
        if (/no encontrada/i.test(err.message ?? "")) setNoEncontrada(true);
        else setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id, esEdicion]);

  // El default del tipo sale de la PRIMERA opción que mandó el backend. Se
  // aplica cuando llegan y solo si nadie eligió todavía: reconstruir los valores
  // enteros acá pisaría lo que ya se hubiera tipeado.
  useEffect(() => {
    const primero = opciones?.tipos?.[0]?.valor;
    if (!primero) return;
    setValores((actuales) => (actuales.tipo ? actuales : { ...actuales, tipo: primero }));
  }, [opciones]);

  /**
   * Cuántos días faltan hasta la fecha del contador.
   *
   * **Lo cuenta el BACKEND, nunca el navegador**: es la única definición de
   * "día" del sistema. Va con debounce porque un `<input type="date">` emite un
   * cambio por cada tecla mientras se tipea la fecha a mano.
   */
  useEffect(() => {
    const fecha = valores.modalFechaObjetivo;
    if (!fecha) {
      setDiasFaltantes(null);
      return undefined;
    }

    let activo = true;
    const temporizador = setTimeout(() => {
      getContadorCampania(fecha)
        .then((datos) => {
          if (activo) setDiasFaltantes(datos?.diasFaltantes ?? null);
        })
        // Falla blanda: sin contador el cartel se muestra sin número, que es
        // exactamente lo que hace el catálogo cuando no hay fecha objetivo.
        .catch(() => {
          if (activo) setDiasFaltantes(null);
        });
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [valores.modalFechaObjetivo]);

  const editar = useCallback((campo, valor) => {
    setSucio(true);
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }, []);

  /**
   * Cambia el destino del CTA. Limpia la referencia en el mismo paso: dejarla
   * puesta al pasar de "Una categoría" a "Un producto" apuntaría el botón a un
   * id de otra tabla, y el backend lo rechazaría con un mensaje que no explica
   * nada.
   */
  const editarDestinoCta = useCallback((tipo) => {
    setSucio(true);
    setValores((actuales) => ({ ...actuales, modalCtaTipo: tipo, modalCtaReferenciaId: "" }));
  }, []);

  /**
   * Ejecuta una mutación de las que persisten solas y refresca el detalle.
   *
   * `reportarError` decide DÓNDE se ve el motivo. El default es el error
   * general de la página, que sirve para lo que se dispara desde el encabezado
   * (duplicar, prender/apagar, el Doodle); las secciones que viven abajo del
   * formulario pasan el suyo para que el aviso entre en el viewport.
   */
  async function conGuardado(operacion, reportarError = setError) {
    setGuardando(true);
    reportarError(null);
    try {
      await operacion();
      return true;
    } catch (err) {
      reportarError(err.message ?? "No se pudo guardar.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function guardar(evento) {
    evento?.preventDefault();
    // Guarda de reentrada: el botón se deshabilita solo, pero Enter en cualquier
    // input dispara el submit nativo igual. Sin esto, dos POST concurrentes
    // crean la campaña por duplicado — y `Campania.nombre` no es único.
    if (guardando) return;

    const payload = construirPayload(valores);
    // El backend consulta la fila referenciada, así que un destino con
    // referencia vacía llega como un 400 que no dice qué falta. Se atrapa acá.
    if (DESTINOS_CON_REFERENCIA.includes(payload.modalCtaTipo) && !payload.modalCtaReferenciaId) {
      setError("Elegí a dónde lleva el botón del cartel.");
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      if (esEdicion) {
        const actualizada = await actualizarCampania(Number(id), payload);
        setCampania((actual) => ({ ...actual, ...actualizada }));
        setSucio(false);
      } else {
        const creada = await crearCampania(payload);
        // DIVERGENCIA DELIBERADA del editor de producto, que vuelve al listado:
        // acá se aterriza en la EDICIÓN de lo recién creado. El Doodle, la
        // vitrina y las promociones necesitan un id, así que mandar al listado
        // dejaría la campaña a medio armar y obligaría a volver a abrirla.
        //
        // `setSucio(false)` ANTES de navegar: si no, `useGuardaSalida`
        // intercepta la salida y pregunta por cambios que ya se guardaron.
        setSucio(false);
        navigate(`/catalogo/admin/campanias/${creada.id}/editar`, { replace: true });
      }
    } catch (err) {
      setError(err.message ?? "No se pudo guardar la campaña.");
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Borra la campaña y vuelve al calendario.
   *
   * Un fallo NO navega ni cierra nada: el diálogo queda abierto con el motivo,
   * porque "no se pudo borrar" y "se borró" tienen que ser distinguibles. El
   * caso real que lo motivó es un 403 por `puedeEliminar`, que con el error
   * pintado detrás del velo se veía como si el botón no hiciera nada.
   */
  async function eliminar() {
    if (eliminando) return;
    setErrorEliminar(null);
    setEliminando(true);
    try {
      await eliminarCampania(Number(id));
      // Igual que en el editor de producto: preguntar por cambios sin guardar
      // sobre algo que acaba de dejar de existir ofrece una decisión vacía.
      setSucio(false);
      navigate("/catalogo/admin/campanias");
    } catch (err) {
      setErrorEliminar(err.message ?? "No se pudo eliminar la campaña.");
      setEliminando(false);
    }
  }

  async function duplicar() {
    let copia = null;
    const ok = await conGuardado(async () => {
      copia = await duplicarCampania(Number(id));
    });
    if (!ok || !copia) return;
    setSucio(false);
    navigate(`/catalogo/admin/campanias/${copia.id}/editar`);
  }

  async function alternarEstado() {
    const siguiente = campania?.estado === "HABILITADA" ? "DESHABILITADA" : "HABILITADA";
    await conGuardado(async () => {
      const actualizada = await cambiarEstadoCampania(Number(id), siguiente);
      setCampania((actual) => ({ ...actual, ...actualizada }));
      setValores((actuales) => ({ ...actuales, estado: actualizada.estado }));
    });
  }

  async function cambiarDoodle(archivo) {
    if (!archivo) return;
    await conGuardado(async () => {
      const actualizada = await subirDoodle(Number(id), archivo);
      setCampania((actual) => ({ ...actual, ...actualizada }));
    });
  }

  async function borrarDoodle() {
    await conGuardado(async () => {
      const actualizada = await quitarDoodle(Number(id));
      setCampania((actual) => ({ ...actual, ...actualizada }));
    });
  }

  /**
   * El arte del slide del banner. Mismo patrón que `cambiarDoodle`/
   * `borrarDoodle`: endpoint propio, persiste en el acto, no toca `sucio` ni
   * el submit del formulario.
   */
  async function cambiarArte(archivo) {
    if (!archivo) return;
    await conGuardado(async () => {
      const actualizada = await subirArte(Number(id), archivo);
      setCampania((actual) => ({ ...actual, ...actualizada }));
    });
  }

  async function borrarArte() {
    await conGuardado(async () => {
      const actualizada = await quitarArte(Number(id));
      setCampania((actual) => ({ ...actual, ...actualizada }));
    });
  }

  /**
   * La vitrina. **Responde el detalle completo**, así que no hace falta un
   * segundo GET para pintar lo que se acaba de guardar.
   *
   * No toca `sucio`: esto ya quedó persistido, y marcar el formulario como
   * pendiente haría que salir pregunte por un cambio que no existe.
   */
  async function guardarProductos(productIds) {
    await conGuardado(async () => {
      const detalle = await guardarProductosDeCampania(Number(id), productIds);
      setCampania(detalle);
    }, setErrorProductos);
  }

  /**
   * Qué promociones aplica la campaña. A diferencia de la vitrina, este endpoint
   * NO devuelve el detalle, así que hay que releerlo para que los checkboxes
   * reflejen lo guardado.
   */
  async function guardarPromociones(promocionIds) {
    await conGuardado(async () => {
      await guardarPromocionesDeCampania(Number(id), promocionIds);
      const detalle = await getCampania(id);
      setCampania(detalle);
    }, setErrorPromociones);
  }

  return {
    esEdicion,
    opciones,
    campania,
    promociones,
    valores,
    diasFaltantes,
    cargando,
    errorCarga,
    noEncontrada,
    guardando,
    error,
    eliminando,
    errorEliminar,
    errorProductos,
    errorPromociones,
    sucio,
    confirmarSalida,
    editar,
    editarDestinoCta,
    guardar,
    eliminar,
    duplicar,
    alternarEstado,
    cambiarDoodle,
    borrarDoodle,
    cambiarArte,
    borrarArte,
    guardarProductos,
    guardarPromociones,
  };
}
