import Advertencia from "./Advertencia.jsx";
import { formatFecha } from "../../utils/formato.js";

/**
 * Aviso de que el backend recortó el período pedido.
 *
 * `parsearPeriodo` (backend) topea cualquier rango a un máximo de días y lo
 * informa como `periodo.recortado: true`. Sin este aviso, quien pide un rango
 * más largo ve números de una ventana más corta sin enterarse — que es
 * exactamente el "mentir en silencio" que las pantallas de analytics tienen
 * prohibido.
 *
 * **No es código muerto.** Hoy `SelectorPeriodo` ofrece 7/30/90 días, así que
 * desde la UI no se puede disparar el recorte: hace falta un request armado a
 * mano o un preset más largo que todavía no existe. Lo que importa es que el
 * backend PUEDE recortar, y si lo hace la pantalla no debe mentir. Borrarlo
 * por "inalcanzable" reabre el agujero en cuanto se agregue un período de un
 * año.
 *
 * Se lee con `?.` a propósito: frontend y backend se despliegan desde repos
 * separados, así que una respuesta sin `periodo` tiene que dar aviso vacío,
 * nunca romper la pantalla.
 *
 * No nombra el máximo en días: ese número (`MAX_DIAS_PERIODO`) vive en el
 * backend y no viaja en la respuesta. Hardcodearlo acá sería una copia que se
 * desincroniza sola la primera vez que el backend lo cambie.
 *
 * @param {object} props
 * @param {{desde?: string, hasta?: string, recortado?: boolean}} [props.periodo]
 *   el `periodo` de la respuesta de analytics.
 */
function AvisoPeriodoRecortado({ periodo }) {
  if (periodo?.recortado !== true) return null;

  // Las fechas son las de la ventana realmente medida, no las pedidas. Si por
  // algún motivo no vinieron, se avisa igual del recorte sin inventar rango:
  // el dato importante es que lo mostrado no es lo pedido.
  const desde = periodo.desde ? formatFecha(periodo.desde) : null;
  const hasta = periodo.hasta ? formatFecha(periodo.hasta) : null;
  const hayRango = desde !== null && hasta !== null;

  return (
    <Advertencia
      testId="advertencia-periodo-recortado"
      titulo="El período mostrado no es el que pediste"
    >
      <p className="font-body-md text-body-md text-on-surface">
        {hayRango
          ? `El rango pedido supera el máximo de días que se puede consultar de una vez, así que los números de abajo cubren una ventana más corta: del ${desde} al ${hasta}.`
          : "El rango pedido supera el máximo de días que se puede consultar de una vez, así que los números de abajo cubren una ventana más corta que la pedida."}
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant">
        {hayRango
          ? "Todo lo anterior a esa fecha de inicio quedó afuera de estos números. Para verlo, pedí un período más corto que termine antes."
          : "El tramo más viejo del rango pedido quedó afuera de estos números. Para verlo, pedí un período más corto."}
      </p>
    </Advertencia>
  );
}

export default AvisoPeriodoRecortado;
