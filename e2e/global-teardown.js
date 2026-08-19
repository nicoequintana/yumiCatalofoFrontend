import { limpiarTodoRastroDeTest, prisma } from "./helpers/db.js";

/**
 * Global teardown de Playwright (ver `globalTeardown` en
 * `playwright.config.js`). Red de seguridad adicional al cleanup puntual de
 * cada test (`afterEach` en cada spec): barre cualquier fila `E2E-TEST-`
 * que haya quedado huérfana porque un test crasheó antes de llegar a su
 * propio cleanup, o porque el proceso de Playwright se interrumpió a mitad
 * de una corrida (ej. Ctrl+C).
 */
export default async function globalTeardown() {
  try {
    await limpiarTodoRastroDeTest();
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
