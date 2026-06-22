// Tipos y constantes de roles — sin dependencias de servidor.
// Importar desde aquí en Client Components en lugar de @/lib/auth.

export type Role = "admin" | "editor" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Lector",
};
