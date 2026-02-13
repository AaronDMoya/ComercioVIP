import { apiFetch } from "@/lib/api";

export interface Asamblea {
  id: string;
  title: string;
  description: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_final: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AsambleasResponse {
  asambleas: Asamblea[];
  total: number;
}

export interface GetAsambleasParams {
  skip?: number;
  limit?: number;
  search?: string;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

/**
 * Obtiene la lista de asambleas con filtros opcionales
 * 
 * @param params - Parámetros de búsqueda y filtrado
 * @returns Lista de asambleas y total de registros
 */
export async function getAsambleas(params: GetAsambleasParams = {}): Promise<AsambleasResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.skip !== undefined) {
    queryParams.append("skip", params.skip.toString());
  }
  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.search) {
    queryParams.append("search", params.search);
  }
  if (params.estado) {
    queryParams.append("estado", params.estado);
  }
  if (params.fecha_desde) {
    queryParams.append("fecha_desde", params.fecha_desde);
  }
  if (params.fecha_hasta) {
    queryParams.append("fecha_hasta", params.fecha_hasta);
  }

  const queryString = queryParams.toString();
  const endpoint = `/asambleas${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: AsambleasResponse = await response.json();
      return data;
    }

    // Intentar obtener el mensaje de error del servidor
    let errorMessage = `Error al obtener asambleas: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Si no se puede parsear el JSON, usar el mensaje por defecto
    }

    throw new Error(errorMessage);
  } catch (error) {
    console.error("Error al obtener asambleas:", error);
    throw error;
  }
}

/**
 * Obtiene una asamblea por ID
 * 
 * @param asambleaId - ID de la asamblea
 * @returns Asamblea
 */
export async function getAsamblea(asambleaId: string): Promise<Asamblea> {
  const endpoint = `/asambleas/${asambleaId}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Asamblea = await response.json();
      return data;
    }

    throw new Error(`Error al obtener asamblea: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener asamblea:", error);
    throw error;
  }
}

/**
 * Actualiza el estado de una asamblea
 * 
 * @param asambleaId - ID de la asamblea
 * @param nuevoEstado - Nuevo estado (CREADA, ACTIVA, CERRADA)
 * @returns Asamblea actualizada
 */
export async function updateAsambleaEstado(
  asambleaId: string,
  nuevoEstado: string
): Promise<Asamblea> {
  const endpoint = `/asambleas/${asambleaId}/estado`;

  try {
    const response = await apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (response.ok) {
      const data: Asamblea = await response.json();
      return data;
    }

    let errorMessage = "Error al actualizar el estado de la asamblea";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  } catch (error) {
    console.error("Error al actualizar estado de asamblea:", error);
    throw error;
  }
}

/**
 * Elimina una asamblea
 * 
 * @param asambleaId - ID de la asamblea
 * @returns Mensaje de confirmación
 */
export async function deleteAsamblea(asambleaId: string): Promise<void> {
  const endpoint = `/asambleas/${asambleaId}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "DELETE",
    });

    if (response.ok) {
      return;
    }

    let errorMessage = "Error al eliminar la asamblea";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  } catch (error) {
    console.error("Error al eliminar asamblea:", error);
    throw error;
  }
}