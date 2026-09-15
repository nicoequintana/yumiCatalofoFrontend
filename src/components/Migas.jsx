import { Fragment } from "react";
import { Link } from "react-router-dom";

/**
 * Migas de pan del catálogo público — el mismo marcado que estrenó
 * `PaginaCombo.jsx` (chevron `chevron_right`, links en
 * `text-primary-container`, `aria-label="Miga de pan"`). Vive acá para que
 * ninguna otra página lo reinvente con clases levemente distintas.
 *
 * `items`: `{ label, to }[]`, en orden desde "Inicio". Todos menos el
 * ÚLTIMO son `<Link>`; el último es la página actual — texto plano con
 * `aria-current="page"`, sin `to` (si lo trae, se ignora).
 *
 * El último nivel trunca a una línea (`truncate`, con `min-w-0` para que el
 * flex item pueda encogerse por debajo de su ancho de contenido): un nombre
 * de producto largo no debe desbordar el ancho en mobile. Los niveles
 * anteriores van `shrink-0` — son los que tienen que quedarse enteros.
 */
function Migas({ items }) {
  if (!items || items.length === 0) return null;

  const ultimo = items.length - 1;

  return (
    <nav
      aria-label="Miga de pan"
      className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden py-3.5 font-body-sm text-[13px] text-on-surface-variant"
    >
      {items.map((item, i) => (
        <Fragment key={item.to ?? item.label}>
          {i > 0 ? (
            <span
              aria-hidden="true"
              className="material-symbols-outlined shrink-0 text-[16px] text-outline"
            >
              chevron_right
            </span>
          ) : null}
          {i === ultimo ? (
            <span aria-current="page" className="min-w-0 truncate">
              {item.label}
            </span>
          ) : (
            <Link to={item.to} className="shrink-0 text-primary-container">
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export default Migas;
