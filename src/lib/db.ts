import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ejecuta `fn` dentro de una transaccion fijando la variable de sesion
 * `avante.changed_by`, que los triggers de auditoria usan para registrar
 * quien hizo el cambio en recipients / parameters / schedules.
 */
export async function withAuditUser<T>(
  email: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "select set_config('avante.changed_by', $1, true)",
      email
    );
    return fn(tx);
  });
}
