/**
 * Bloque de advertencia de las pantallas de analytics del admin (Ventas,
 * Embudo, Clientes, Operación).
 *
 * Es la carcasa compartida de los avisos que aclaran **cómo hay que leer los
 * números que vienen abajo**: histórico recortado, período no comparable,
 * período recortado por el tope de días. Los tres decían lo mismo a nivel
 * visual —superficie `tertiary-container` con borde, ícono de advertencia y
 * un rótulo en mayúsculas— y estaban copiados pantalla por pantalla; acá vive
 * una sola vez.
 *
 * Solo aporta la carcasa: el texto va como `children`, porque lo que cambia
 * entre un aviso y otro es exactamente el texto y nada más. Parametrizar el
 * cuerpo con props lo convertiría en una plantilla rígida sin ganar nada.
 *
 * `role="status"` y no `role="alert"`: es una aclaración sobre datos que ya
 * están en pantalla, así que el lector de pantalla la anuncia cuando termina
 * lo que esté leyendo, sin interrumpir.
 *
 * Va SIEMPRE antes de los números que califica, nunca después: un aviso que
 * aparece debajo llega cuando la persona ya sacó su conclusión.
 *
 * @param {object} props
 * @param {string} props.titulo - rótulo corto en mayúsculas; dice qué pasa,
 *   no "atención".
 * @param {string} [props.icono="warning"] - ícono de Material Symbols.
 * @param {string} [props.testId] - `data-testid` para los tests de la pantalla.
 * @param {import("react").ReactNode} props.children - el cuerpo del aviso.
 */
function Advertencia({ titulo, icono = "warning", testId, children }) {
  return (
    <div
      {...(testId ? { "data-testid": testId } : {})}
      role="status"
      className="mb-8 flex flex-col gap-3 rounded-xl border border-outline bg-tertiary-container p-4 md:p-5"
    >
      <div className="flex items-center gap-2 text-on-surface">
        <span className="material-symbols-outlined text-[20px]">{icono}</span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest">
          {titulo}
        </span>
      </div>
      {children}
    </div>
  );
}

export default Advertencia;
