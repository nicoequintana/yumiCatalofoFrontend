import { useEffect, useState } from "react";

/**
 * El techo de espera de una pantalla que se tapa mientras carga.
 *
 * **UN LOADER SIN TECHO ES UN SITIO CAÍDO.** Toda pantalla que se esconde
 * detrás de un spinner hasta que N fuentes contesten depende de que las N
 * contesten SIEMPRE — y eso no se puede garantizar: un fetch colgado (no
 * rechazado), un `then` que nunca corre porque el componente se desmontó a
 * mitad de camino, o simplemente una fuente nueva que alguien suma mañana sin
 * su `resuelto`. Cualquiera de las tres deja la pantalla en blanco para
 * siempre, sin error en ningún lado.
 *
 * Este hook es el corte de esa clase entera de fallas: pasado el tope, la
 * pantalla se muestra con lo que haya.
 */

/**
 * 2 segundos.
 *
 * POR QUÉ ESE NÚMERO, y no uno más generoso: es el último instante en que la
 * home todavía puede pintar dentro del umbral de 2,5 s con que Google califica
 * un LCP como "bueno" —quedan ~500 ms de margen para terminar de pintar—.
 * ⚠️ Hasta el 13/09/2026 ese margen era para la FOTO del hero
 * (`fetchPriority="high"`, precargada MIENTRAS el loader está puesto); el
 * hero del rediseño de esa fecha es copy puro, sin foto (ver "Hero",
 * `docs/reglas/catalogo-publico.md`), así que hoy el margen es genérico —
 * el razonamiento del NÚMERO (2s, con margen para terminar de pintar bajo el
 * umbral de LCP) sigue valiendo igual, solo cambió qué elemento se
 * beneficiaba del margen.
 * Un techo más alto compraría un poco menos de riesgo de soltar temprano al
 * precio de la métrica que este proyecto mide.
 *
 * ⚠️ **Tiene que quedar MUY por debajo de los 15 s de `AbortSignal.timeout`
 * que `api/http.js` le aplica a todo fetch de la app.** Ese timeout es la otra
 * red, pero es una red para el USUARIO DE UNA PANTALLA YA VISIBLE: esperar 15 s
 * mirando una home en blanco es peor que el salto de layout que este loader
 * vino a esconder. Por eso el techo se mide contra el timeout, no al revés, y
 * hay un test que fija esa relación.
 *
 * CONSECUENCIA ASUMIDA: en una conexión lenta el techo vence antes que los
 * fetch, la home se dibuja incompleta y el salto de layout VUELVE. Es la
 * degradación correcta — el sitio se ve tarde y salta, en vez de no verse.
 */
export const TECHO_ESPERA_MS = 2000;

/**
 * Devuelve `true` cuando pasaron `ms` desde el montaje.
 *
 * @param {number} [ms] el tope, en milisegundos
 */
export default function useTechoDeEspera(ms = TECHO_ESPERA_MS) {
  const [vencido, setVencido] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setVencido(true), ms);
    return () => clearTimeout(temporizador);
  }, [ms]);

  return vencido;
}
