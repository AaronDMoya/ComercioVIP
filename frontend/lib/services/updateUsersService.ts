import { apiFetch } from "@/lib/api";

export interface IngresoResponse {
  token: string;
}

export interface RegistroPublicResponse {
  id: string;
  asamblea_id: string;
  asamblea_title: string;
  cedula: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  numero_torre?: string | null;
  numero_apartamento?: string | null;
}

/**
 * Ingreso por número de torre y apartamento. Devuelve un token para acceder a actualizar datos.
 */
export async function ingreso(
  asambleaId: string,
  numeroTorre: string,
  numeroApartamento: string
): Promise<IngresoResponse> {
  const response = await apiFetch("/update-users/ingreso", {
    method: "POST",
    body: JSON.stringify({
      asamblea_id: asambleaId,
      numero_torre: numeroTorre.trim(),
      numero_apartamento: numeroApartamento.trim(),
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.detail || "No se encontró un registro con esa torre y apartamento.") as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Obtiene los datos del registro asociado al token (para edición).
 */
export async function getRegistroByToken(token: string): Promise<RegistroPublicResponse> {
  const response = await apiFetch(
    `/update-users/registro?token=${encodeURIComponent(token)}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.detail || "Enlace no válido o expirado.") as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Actualiza los datos del registro (solo cedula, nombre, telefono, correo).
 */
export async function actualizarRegistroByToken(
  token: string,
  data: { cedula?: string; nombre?: string; telefono?: string; correo?: string }
): Promise<RegistroPublicResponse> {
  const response = await apiFetch("/update-users/registro", {
    method: "PATCH",
    body: JSON.stringify({ token, ...data }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const e = new Error(err.detail || "Error al guardar los datos.") as Error & { status?: number };
    e.status = response.status;
    throw e;
  }

  return response.json();
}
