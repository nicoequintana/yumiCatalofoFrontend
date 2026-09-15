/**
 * La grilla de `/combos` (`CatalogoCombos.jsx`): una columna en mobile, dos
 * desde `md`, filas del mismo alto (`auto-rows-fr`) y `.grilla-combos`
 * (`index.css`), que centra la última card cuando la cantidad es impar.
 * ÚNICA fuente: la vista previa del editor (`AdminComboForm.jsx`) la usa tal
 * cual, así lo que ve el admin no se desincroniza de la tienda.
 */
export default function GrillaCombos({ children }) {
  return (
    <div className="grilla-combos grid auto-rows-fr grid-cols-1 gap-[26px] md:grid-cols-2 md:gap-x-[26px] md:gap-y-8">
      {children}
    </div>
  );
}
