import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { escalaParaAncho, medidasDelMarco } from "./escalaLienzo.js";

const ATRIBUTO_COPIA = "data-lienzo-estilo";
const ALTO_INICIAL = 600;
/** Con tope, el marco tampoco pasa de este tanto de la ventana del panel. */
const FRACCION_MAXIMA_VENTANA = 0.6;

/** Clona las hojas del documento del panel (links de fuentes + CSS de la app) al iframe. */
function copiarEstilos(origen, destino) {
  destino.head.querySelectorAll(`[${ATRIBUTO_COPIA}]`).forEach((nodo) => nodo.remove());
  origen.head.querySelectorAll('link[rel="stylesheet"], style').forEach((nodo) => {
    const copia = nodo.cloneNode(true);
    copia.setAttribute(ATRIBUTO_COPIA, "");
    destino.head.appendChild(copia);
  });
}

function esNodoDeEstilo(nodo) {
  return nodo.nodeName === "STYLE" || (nodo.nodeName === "LINK" && nodo.rel === "stylesheet");
}

/**
 * Lienzo de la vista previa del editor de combos: dibuja `children` al ancho
 * REAL de la tienda (`ancho`, 1280 o 390) y lo achica con `transform: scale`
 * para que entre en la columna del panel.
 *
 * Por qué un iframe y no un `<div>` de 1280px: la tienda no decide su layout
 * solo por container query. `md:grid-cols-2` de `/combos`, `.fila-combos-pista`
 * y los `md:px-*` de las secciones son `@media` del VIEWPORT, así que dentro de
 * un div el "Celular" a 1440 de panel se veía de escritorio. El iframe tiene
 * SU viewport del ancho pedido. Tampoco hereda `data-tema-admin="oscuro"` del
 * `<html>` del panel: los tokens que `.tema-publico` no redefine no se tiñen.
 *
 * El contenido entra por portal (mismo árbol de React: Router y Toast siguen
 * disponibles) dentro de un `.tema-publico` INERTE — sin esto "Agregar combo"
 * metería el combo en el carrito del admin. El iframe en sí NO es inerte (con
 * `tabIndex=-1`, no entra al orden de foco): la rueda tiene que llegar a su
 * documento. Sin `altoMaximo` ese documento no scrollea y la rueda sigue de
 * largo al panel; con `altoMaximo` (px) el iframe es un viewport cortado que
 * scrollea ADENTRO, así la barra fija de la página queda pegada abajo.
 *
 * Sin leyenda encima: el ancho lo dice la barra del editor, afuera del lienzo.
 */
function LienzoTienda({ ancho, altoMaximo = null, children }) {
  const lienzoRef = useRef(null);
  const marcoRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [contenido, setContenido] = useState(null);
  const [escala, setEscala] = useState(1);
  const [alto, setAlto] = useState(ALTO_INICIAL);

  // Documento del iframe: listo apenas se monta (about:blank). Se re-prepara en
  // `load` por si el navegador reemplaza el documento inicial.
  useEffect(() => {
    const marco = marcoRef.current;
    if (!marco) return undefined;

    function preparar() {
      const documento = marco.contentDocument;
      if (!documento?.body) return;
      documento.documentElement.lang = document.documentElement.lang || "es";
      documento.body.style.margin = "0";
      copiarEstilos(document, documento);
      setDoc(documento);
    }

    preparar();
    marco.addEventListener("load", preparar);

    // En desarrollo Vite inyecta y reemplaza <style> con HMR: se vuelven a copiar.
    const observador = new MutationObserver((cambios) => {
      const tocaEstilos = cambios.some((cambio) =>
        [...cambio.addedNodes, ...cambio.removedNodes].some(esNodoDeEstilo),
      );
      const documento = marco.contentDocument;
      if (tocaEstilos && documento?.head) copiarEstilos(document, documento);
    });
    observador.observe(document.head, { childList: true });

    return () => {
      marco.removeEventListener("load", preparar);
      observador.disconnect();
    };
  }, []);

  // Con tope el documento de la tienda scrollea; sin tope, no (y vuelve arriba al cambiar).
  useEffect(() => {
    if (!doc) return;
    doc.documentElement.style.overflowX = "hidden";
    doc.documentElement.style.overflowY = altoMaximo ? "auto" : "hidden";
    doc.defaultView?.scrollTo?.(0, 0);
  }, [doc, altoMaximo, ancho]);

  // Escala: ancho disponible del marco sobre el ancho real de la tienda.
  useLayoutEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return undefined;
    const medir = () => setEscala(escalaParaAncho(lienzo.clientWidth, ancho));
    medir();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(medir);
    observador.observe(lienzo);
    return () => observador.disconnect();
  }, [ancho]);

  // Alto: el del contenido YA dibujado a ese ancho (fotos que cargan, cambio de modo).
  useEffect(() => {
    if (!contenido) return undefined;
    const medir = () => {
      if (contenido.offsetHeight > 0) setAlto(contenido.offsetHeight);
    };
    medir();
    const Observador = contenido.ownerDocument.defaultView?.ResizeObserver;
    if (!Observador) return undefined;
    const observador = new Observador(medir);
    observador.observe(contenido);
    return () => observador.disconnect();
  }, [contenido]);

  const tope = altoMaximo ? Math.min(altoMaximo, Math.round(window.innerHeight * FRACCION_MAXIMA_VENTANA)) : null;
  const { altoMarco, altoIframe } = medidasDelMarco({ altoContenido: alto, escala, altoMaximo: tope });
  const esCelular = ancho < 768;

  return (
    <div className={`mx-auto w-full ${esCelular ? "max-w-[392px]" : ""}`}>
      <div
        ref={lienzoRef}
        className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-ambient"
        style={{ height: altoMarco + 2 }}
      >
        <iframe
          ref={marcoRef}
          title="Vista previa en la tienda"
          width={ancho}
          height={altoIframe}
          tabIndex={-1}
          className="block origin-top-left border-0"
          style={{ width: ancho, height: altoIframe, transform: `scale(${escala})` }}
        />
      </div>
      {doc
        ? createPortal(
            <div ref={setContenido} inert className="tema-publico flow-root bg-background">
              {children}
            </div>,
            doc.body,
          )
        : null}
    </div>
  );
}

export default LienzoTienda;
