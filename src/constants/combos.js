/**
 * Textos de la fila de combos de la home (`FilaCombos` en `Catalogo.jsx`). Viven
 * acá y no escritos en la página porque la vista previa del editor de combos
 * (`AdminComboForm.jsx`, "Card en la home") pinta la MISMA fila: una copia a
 * mano divergiría en silencio de lo que ve el cliente.
 */
/**
 * Contenedor de `/combos` (`CatalogoCombos.jsx`), compartido con la vista
 * previa "Card en el catálogo" del editor. `pb-32`: en celular la isla flotante
 * y el FAB de WhatsApp quedan fijos abajo y taparían los botones de la última card.
 */
export const CLASE_SECCION_CATALOGO_COMBOS =
  "mx-auto grid w-full max-w-container-max gap-7 px-margin-mobile pb-32 pt-5 md:gap-8 md:px-margin-desktop md:pb-24 md:pt-8";

export const FILA_COMBOS_HOME = {
  titulo: "Combos que te ahorran plata",
  bajada: "Llevá el set completo y pagá menos que comprando cada cosa por separado.",
  enlace: { texto: "Ver todos los combos", to: "/combos" },
};
