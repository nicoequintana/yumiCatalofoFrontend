import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminCombo,
  crearCombo,
  actualizarCombo,
  guardarHeroCombo,
  quitarHeroCombo,
  cotizarCombo,
  eliminarCombo,
  getOpcionesCombo,
} from "../api/combos.js";
import { getProducts } from "../api/products.js";
import { DEBOUNCE_BUSQUEDA_MS } from "./useTablaAdmin.js";

const COMBO_EN_BLANCO = { nombre: "", frase: "", porcentaje: 15, vigencia: "SIEMPRE", activo: false, heroUrl: null, items: [] };
const DEBOUNCE_COTIZAR_MS = 400;
const RESULTADOS_BUSQUEDA = 8;

function filaDeProducto(producto, cantidad) {
  return { productId: producto.id ?? producto.productId, nombre: producto.nombre, sku: producto.sku, precio: producto.precio, stock: producto.stock, cantidad };
}

/**
 * Estado y guardado del editor de combos (spec §8.3). Sin reglas de negocio:
 * la composición y el % los valida el backend al guardar, y la cuenta llega
 * de `cotizar` con debounce sobre items y porcentaje (no por cada tecla del
 * nombre). `cotizar` también resuelve, sin que este hook los recalcule,
 * `limitante` ("Lo limita X", spec §8.3.3) e `items[].descuento` (la pill de
 * "promo vigente" por fila, spec §8.3.2) — el hook solo los reexpone.
 *
 * `sucio` es el "Cambios sin guardar" del encabezado (spec §8.3): se prende
 * con cualquier edición del FORMULARIO (nombre, frase, %, vigencia, activo,
 * productos). El hero NO lo toca — tiene endpoint propio y persiste al
 * subirlo/quitarlo, mismo criterio que el Doodle de `useCampaniaEditor.js`
 * ("no toca `sucio`: esto ya quedó persistido").
 */
export default function useComboEditor(id) {
  const [combo, setCombo] = useState(null);
  const [cambios, cambiosInternos] = useState(COMBO_EN_BLANCO);
  const [sucio, setSucio] = useState(false);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // Setter expuesto: cualquier llamada de afuera es una edición del
  // formulario y marca "cambios sin guardar". Las actualizaciones internas
  // (cargar el detalle, aplicar la respuesta de subir/quitar el hero) usan
  // `cambiosInternos` directo, sin pasar por acá, para no ensuciar algo que
  // ya está guardado.
  const setCambios = useCallback((actualizador) => {
    setSucio(true);
    cambiosInternos(actualizador);
  }, []);

  useEffect(() => {
    getOpcionesCombo().then(setOpciones).catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    if (!id) {
      setCargando(false);
      return undefined;
    }
    let activo = true;
    getAdminCombo(id)
      .then((detalle) => {
        if (!activo) return;
        setCombo(detalle);
        cambiosInternos({
          nombre: detalle.nombre,
          frase: detalle.frase,
          porcentaje: detalle.porcentaje,
          vigencia: detalle.vigencia,
          activo: detalle.activo,
          heroUrl: detalle.heroUrl,
          items: detalle.items.map((item) => filaDeProducto(item, item.cantidad)),
        });
        setSucio(false);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err?.message || "No se pudo cargar el combo.");
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [id]);

  function agregarProducto(producto) {
    setCambios((actual) =>
      actual.items.some((item) => item.productId === producto.id)
        ? actual
        : { ...actual, items: [...actual.items, filaDeProducto(producto, 1)] },
    );
  }

  function quitarProducto(productId) {
    setCambios((actual) => ({ ...actual, items: actual.items.filter((item) => item.productId !== productId) }));
  }

  function cambiarCantidad(productId, cantidad) {
    setCambios((actual) => ({
      ...actual,
      items: actual.items.map((item) => (item.productId === productId ? { ...item, cantidad } : item)),
    }));
  }

  // Cotización: solo cuando cambia lo que mueve un número (items o %).
  const firmaCotizacion = JSON.stringify([cambios.items.map((i) => [i.productId, i.cantidad]), cambios.porcentaje]);
  const temporizadorCotizar = useRef(null);
  useEffect(() => {
    clearTimeout(temporizadorCotizar.current);
    if (cambios.items.length === 0) {
      setCotizacion(null);
      return undefined;
    }
    temporizadorCotizar.current = setTimeout(() => {
      cotizarCombo({
        items: cambios.items.map((item) => ({ productId: item.productId, cantidad: item.cantidad })),
        porcentaje: cambios.porcentaje,
      })
        .then(setCotizacion)
        // Una composición que el backend rechaza (menos de 2 unidades, % fuera
        // de rango) no tiene cuenta que mostrar: la vista previa espera.
        .catch(() => setCotizacion(null));
    }, DEBOUNCE_COTIZAR_MS);
    return () => clearTimeout(temporizadorCotizar.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `firmaCotizacion` resume items y porcentaje
  }, [firmaCotizacion]);

  // Buscador por nombre o SKU: mismo endpoint y debounce que `SelectorProductos.jsx`.
  useEffect(() => {
    const termino = busqueda.trim();
    if (termino === "") {
      setResultados([]);
      return undefined;
    }
    let activo = true;
    setBuscando(true);
    const temporizador = setTimeout(() => {
      getProducts({ admin: true, search: termino, page: 1, pageSize: RESULTADOS_BUSQUEDA })
        .then((sobre) => {
          if (activo) setResultados(sobre?.data ?? []);
        })
        .catch(() => {
          if (activo) setResultados([]);
        })
        .finally(() => {
          if (activo) setBuscando(false);
        });
    }, DEBOUNCE_BUSQUEDA_MS);
    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [busqueda]);

  async function accion(operacion) {
    setGuardando(true);
    setError(null);
    try {
      return await operacion();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el combo.");
      return null;
    } finally {
      setGuardando(false);
    }
  }

  function guardar() {
    const payload = {
      nombre: cambios.nombre,
      frase: cambios.frase,
      porcentaje: cambios.porcentaje,
      vigencia: cambios.vigencia,
      activo: cambios.activo,
      items: cambios.items.map((item) => ({ productId: item.productId, cantidad: item.cantidad })),
    };
    return accion(async () => {
      const guardado = id ? await actualizarCombo(id, payload) : await crearCombo(payload);
      setCombo(guardado);
      // Recién acá lo guardado deja de ser un cambio pendiente. Un fallo NO
      // llega hasta esta línea (el `throw` corta antes en `accion`), así que
      // `sucio` queda como estaba: la persona no perdió el aviso de que
      // todavía tiene algo sin guardar.
      setSucio(false);
      return guardado;
    });
  }

  function eliminar() {
    if (!id) return Promise.resolve(null);
    return accion(async () => {
      await eliminarCombo(id);
      return { ok: true };
    });
  }

  async function subirHero(archivo) {
    if (!id) {
      setError("Guardá el combo antes de cargar la imagen principal.");
      return null;
    }
    return accion(async () => {
      const guardado = await guardarHeroCombo(id, archivo);
      setCombo(guardado);
      cambiosInternos((actual) => ({ ...actual, heroUrl: guardado.heroUrl }));
      return guardado;
    });
  }

  function quitarHero() {
    return accion(async () => {
      const guardado = await quitarHeroCombo(id);
      setCombo(guardado);
      // El backend apaga el combo al quitar el hero (Task 7).
      cambiosInternos((actual) => ({ ...actual, heroUrl: null, activo: false }));
      return guardado;
    });
  }

  return {
    combo,
    cargando,
    cambios,
    setCambios,
    sucio,
    agregarProducto,
    quitarProducto,
    cambiarCantidad,
    cotizacion,
    busqueda,
    setBusqueda,
    resultados,
    buscando,
    guardando,
    error,
    guardar,
    eliminar,
    subirHero,
    quitarHero,
    opciones,
  };
}
