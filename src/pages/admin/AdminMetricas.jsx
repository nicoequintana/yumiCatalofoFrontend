import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { getProducts } from "../../api/products.js";

/**
 * `/catalogo/admin/metricas` — read-only table of view/share counts per
 * product (design item: Feature 3 of the 6-feature batch). Built as a flat
 * table specifically so more metrics can be added later as columns, without
 * restructuring this screen.
 */
function AdminMetricas() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getProducts().then((data) => {
      if (!activo) return;
      // Most-viewed first — the most immediately useful ordering for an
      // admin checking "what's popular" at a glance.
      setProductos([...data].sort((a, b) => b.vistas - a.vistas));
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-16">
      <div className="mb-6">
        <BotonVolver />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Métricas</h1>
      </div>

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando métricas…</p>
        </div>
      ) : productos.length === 0 ? (
        <EstadoVacio
          icono="query_stats"
          titulo="Todavía no hay productos"
          mensaje="Las métricas van a aparecer acá una vez que tengas productos publicados."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Vistas
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Compartidos
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">{producto.nombre}</td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">{producto.vistas}</td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {producto.compartidos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminMetricas;
