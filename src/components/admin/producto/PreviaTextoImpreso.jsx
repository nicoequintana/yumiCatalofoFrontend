import { textoQueSeImprime } from "../../../utils/textoImpreso.js";

/**
 * Muestra qué texto de la ficha se va a DIBUJAR dentro de las imágenes.
 *
 * Existe porque desde el 27/08/2026 esos campos dejaron de ser contexto del
 * prompt: se imprimen literales. Un typo ya no degrada la imagen, se ve en el
 * catálogo hasta que alguien borre la carpeta y regenere. El momento de
 * revisarlo es antes de gastar los créditos, no después de ver el resultado.
 *
 * Replica el orden real del flujo, incluido el sort de los callouts por
 * longitud: mostrar el orden del array sería mostrar algo que no va a pasar.
 */
function Grupo({ rotulo, children }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-widest text-secondary">
        {rotulo}
      </span>
      <ul className="m-0 list-disc pl-5">{children}</ul>
    </div>
  );
}

function PreviaTextoImpreso({ producto }) {
  const { beneficios, cotas, callouts } = textoQueSeImprime(producto);
  const hayAlgo = beneficios.length > 0 || cotas.length > 0 || callouts.length > 0;

  if (!hayAlgo) {
    return (
      <p
        role="status"
        className="font-body-md text-body-md mb-4 rounded-lg bg-tertiary-container px-4 py-3 text-on-surface"
      >
        Esta ficha no tiene beneficios, características ni especificaciones cargadas, así que las
        imágenes van a salir <strong>sin texto</strong>. Completala antes de generar.
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-r-lg border border-l-4 border-outline-variant border-l-tertiary-container bg-surface p-4">
      <p className="font-body-md text-body-md mb-1 flex items-center gap-2 font-semibold text-on-surface">
        <span className="material-symbols-outlined text-[19px] text-secondary">text_fields</span>
        Este texto se va a dibujar dentro de las imágenes
      </p>
      <p className="font-body-md text-body-md mb-3 text-on-surface-variant">
        Se imprime tal cual, sin corregir. Revisalo antes de generar: un error acá termina impreso
        en una foto del catálogo.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {beneficios.length > 0 ? (
          <Grupo rotulo="Beneficios · imagen 3">
            {beneficios.map((texto) => (
              <li key={texto} className="font-body-md text-body-md text-on-surface">
                {texto}
              </li>
            ))}
          </Grupo>
        ) : null}

        {cotas.length > 0 ? (
          <Grupo rotulo="Cotas · imagen 4">
            {cotas.map((spec) => (
              <li key={spec.nombre} className="font-body-md text-body-md text-on-surface">
                {spec.nombre} — {spec.valor}
              </li>
            ))}
          </Grupo>
        ) : null}

        {callouts.length > 0 ? (
          <Grupo rotulo="Etiquetas · imagen 4">
            {callouts.map((spec) => (
              <li key={`${spec.nombre}-${spec.valor}`} className="font-body-md text-body-md text-on-surface">
                {spec.nombre ? `${spec.nombre} — ` : ""}
                {spec.valor}
              </li>
            ))}
          </Grupo>
        ) : null}
      </div>
    </div>
  );
}

export default PreviaTextoImpreso;
