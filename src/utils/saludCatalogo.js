import { MIN_DESTACADOS } from "../hooks/useDestacados.js";

/**
 * Las reglas de la pantalla "Salud del catálogo": qué cuenta como problema y
 * con qué gravedad.
 *
 * Vive aparte del componente a propósito, y no solo porque el lint se queje de
 * exportar una función desde un archivo de componentes. Lo que hay acá son
 * DECISIONES DE NEGOCIO —cuántas fotos de menos importan, a partir de cuándo un
 * agotado es urgente—, no presentación. Separarlas hace que se puedan discutir
 * y testear sin JSX en el medio, que es exactamente lo que hace su test.
 *
 * Es una función PURA: recibe los conteos del backend y devuelve las filas ya
 * evaluadas. No sabe nada de React.
 */

/** Los tres estados de un chequeo. El orden importa: define la prioridad visual. */
export const GRAVE = "grave";
export const AVISO = "aviso";
export const BIEN = "bien";

export const ESTILO = {
  [GRAVE]: "bg-error-container text-on-error-container",
  [AVISO]: "bg-tertiary-container text-on-tertiary-container",
  [BIEN]: "bg-secondary-container text-on-secondary-container",
};

export const ICONO = {
  [GRAVE]: "priority_high",
  [AVISO]: "info",
  [BIEN]: "check",
};

/**
 * Arma los chequeos a partir de los conteos.
 *
 * Es una función PURA y está separada del render a propósito: cada umbral es
 * una decisión de negocio ("¿cuántas fotos de menos es un problema?") y así se
 * lee y se discute en un solo lugar, sin JSX en el medio.
 */
export function construirChequeos(salud) {
  const publicados = salud.publicados ?? 0;

  return [
    {
      titulo: "Exposición",
      descripcion: "Lo que decide si a tus productos los llega a ver alguien.",
      filas: [
        {
          clave: "destacados",
          etiqueta: "Productos destacados publicados",
          valor: salud.destacadosPublicados,
          // Por debajo del mínimo la home ESCONDE el carrusel entero. No es
          // que se vea con menos productos: no se ve.
          estado: salud.destacadosPublicados >= MIN_DESTACADOS ? BIEN : GRAVE,
          detalle:
            salud.destacadosPublicados >= MIN_DESTACADOS
              ? `El carrusel de la home se está mostrando.`
              : `El carrusel "Hallazgos del día" de la home NO se está mostrando: necesita ${MIN_DESTACADOS} destacados publicados y hay ${salud.destacadosPublicados}.`,
          accion: { texto: "Marcar destacados", a: "/catalogo/admin/productos" },
        },
        {
          clave: "sin-vistas",
          etiqueta: "Publicados sin ninguna visita",
          valor: salud.publicadosSinVistas,
          de: publicados,
          estado: salud.publicadosSinVistas === 0 ? BIEN : AVISO,
          detalle:
            salud.publicadosSinVistas === 0
              ? "Todos tus productos publicados recibieron al menos una visita."
              : "Están en la tienda y nadie los abrió todavía. Puede ser falta de tráfico, no necesariamente un problema del producto.",
          // Sin acción: el listado ordena por vistas descendente, no ascendente,
          // así que no hay forma de llevarlo a "los que no tuvieron ninguna".
        },
      ],
    },
    {
      titulo: "Contenido",
      descripcion: "Lo que decide si, una vez que lo ven, lo compran.",
      filas: [
        {
          clave: "publicados-sin-fotos",
          etiqueta: "Publicados sin ninguna foto",
          valor: salud.publicadosSinFotos,
          // El peor caso posible del catálogo: la ficha se le abre a un cliente
          // con la galería vacía.
          estado: salud.publicadosSinFotos === 0 ? BIEN : GRAVE,
          detalle:
            salud.publicadosSinFotos === 0
              ? "Ningún producto publicado está sin fotos."
              : "Están a la venta y su ficha abre con la galería vacía.",
          accion: {
            texto: "Ver los que menos fotos tienen",
            a: "/catalogo/admin/productos?orden=fotos-asc",
          },
        },
        {
          clave: "menos-de-dos-fotos",
          etiqueta: "Con menos de dos fotos",
          valor: salud.menosDeDosFotos,
          de: salud.total,
          estado: salud.menosDeDosFotos === 0 ? BIEN : AVISO,
          // La segunda foto no es "una más": es la imagen de la sección
          // "¿Qué problema resuelve?" de la ficha. Sin ella, esa sección
          // repite la portada.
          detalle:
            salud.menosDeDosFotos === 0
              ? "Todos tienen al menos dos fotos."
              : 'La segunda foto es la de "¿Qué problema resuelve?" en la ficha. Sin ella, esa sección repite la portada.',
          accion: {
            texto: "Ver los que menos fotos tienen",
            a: "/catalogo/admin/productos?orden=fotos-asc",
          },
        },
        {
          clave: "sin-categoria",
          etiqueta: "Sin categoría",
          valor: salud.sinCategoria,
          estado: salud.sinCategoria === 0 ? BIEN : AVISO,
          detalle:
            salud.sinCategoria === 0
              ? "Todos los productos están categorizados."
              : "No aparecen al filtrar por categoría ni en la página de ninguna categoría.",
        },
      ],
    },
    {
      titulo: "Disponibilidad y costeo",
      descripcion: "Lo que decide si la venta se puede concretar, y con cuánto margen.",
      filas: [
        {
          clave: "agotados-con-vistas",
          etiqueta: "Agotados que igual reciben visitas",
          valor: salud.agotadosConVistas,
          // Demanda medida contra stock cero: es lo más caro de esta pantalla.
          estado: salud.agotadosConVistas === 0 ? BIEN : GRAVE,
          detalle:
            salud.agotadosConVistas === 0
              ? "No hay demanda cayendo en productos sin stock."
              : "Hay gente entrando a fichas que no se pueden comprar. Es venta que se está perdiendo, y es medible.",
          accion: { texto: "Ver por stock", a: "/catalogo/admin/productos?orden=stock-asc" },
        },
        {
          clave: "agotados",
          etiqueta: "Agotados",
          valor: salud.agotados,
          estado: salud.agotados === 0 ? BIEN : AVISO,
          detalle:
            salud.agotados === 0
              ? "Todos los productos tienen stock."
              : "Salen del listado público, pero su ficha sigue siendo alcanzable por link.",
          accion: { texto: "Ver por stock", a: "/catalogo/admin/productos?orden=stock-asc" },
        },
        {
          clave: "ocultos",
          etiqueta: "Ocultos del catálogo",
          valor: salud.ocultos,
          estado: salud.ocultos === 0 ? BIEN : AVISO,
          // Ocultar es deliberado, así que no es un error: es un recordatorio.
          detalle:
            salud.ocultos === 0
              ? "Todo el catálogo está visible."
              : "Están cargados pero nadie los puede ver. Si era temporal, quizá quedaron olvidados.",
          accion: { texto: "Ver el catálogo", a: "/catalogo/admin/productos" },
        },
        {
          clave: "sin-costo",
          etiqueta: "Sin costo cargado",
          valor: salud.sinCosto,
          estado: salud.sinCosto === 0 ? BIEN : AVISO,
          detalle:
            salud.sinCosto === 0
              ? "Todos tienen costo y coeficiente."
              : "Sin costo no se puede calcular el precio ni, más adelante, el margen de sus ventas.",
          accion: { texto: "Costos y precios", a: "/catalogo/admin/productos/precios" },
        },
      ],
    },
  ];
}
