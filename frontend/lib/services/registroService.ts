import { apiFetch } from "@/lib/api";

export interface Registro {
  id: string;
  asamblea_id: string;
  cedula: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  numero_torre: string | null;
  numero_apartamento: string | null;
  numero_control: string | null;
  coeficiente: number | null;
  actividad_ingreso: Record<string, any> | null;
  gestion_poderes: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface SearchParams {
  cedula?: string;
  numero_torre?: string;
  numero_apartamento?: string;
  numero_control?: string;
}

export interface PoderSearchParams {
  torre?: string;
  apartamento?: string;
  numero_control?: string;
}

export interface TransferirPoderParams {
  registro_destino_id: string;
  torre: string;
  apartamento: string;
  numero_control: string;
}

export interface DevolverPoderParams {
  registro_actual_id: string;
  torre: string;
  apartamento: string;
  numero_control: string;
}

/**
 * Obtiene un registro por ID
 * 
 * @param registroId - ID del registro
 * @returns Registro
 */
export async function getRegistro(registroId: string): Promise<Registro> {
  const endpoint = `/registros/${registroId}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Registro = await response.json();
      return data;
    }

    throw new Error(`Error al obtener registro: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener registro:", error);
    throw error;
  }
}

/**
 * Obtiene todos los registros de una asamblea
 * 
 * @param asambleaId - ID de la asamblea
 * @returns Lista de registros
 */
export async function getRegistros(asambleaId: string): Promise<Registro[]> {
  const endpoint = `/registros/asamblea/${asambleaId}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Registro[] = await response.json();
      return data;
    }

    let message = `Error al obtener registros: ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  } catch (error) {
    console.error("Error al obtener registros:", error);
    throw error;
  }
}

/**
 * Busca registros de una asamblea por criterios
 * 
 * @param asambleaId - ID de la asamblea
 * @param params - Parámetros de búsqueda
 * @returns Lista de registros encontrados
 */
export async function searchRegistros(
  asambleaId: string,
  params: SearchParams
): Promise<Registro[]> {
  const searchParams = new URLSearchParams();
  
  if (params.cedula) searchParams.append("cedula", params.cedula);
  if (params.numero_torre) searchParams.append("numero_torre", params.numero_torre);
  if (params.numero_apartamento) searchParams.append("numero_apartamento", params.numero_apartamento);
  if (params.numero_control) searchParams.append("numero_control", params.numero_control);

  const endpoint = `/registros/asamblea/${asambleaId}/buscar?${searchParams.toString()}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Registro[] = await response.json();
      return data;
    }

    throw new Error(`Error al buscar registros: ${response.status}`);
  } catch (error) {
    console.error("Error al buscar registros:", error);
    throw error;
  }
}

/**
 * Busca registros para autocompletado de poderes
 * 
 * @param asambleaId - ID de la asamblea
 * @param params - Parámetros de búsqueda (torre, apartamento, numero_control)
 * @param limit - Límite de resultados (default: 10)
 * @returns Lista de registros encontrados
 */
export async function buscarRegistrosParaPoderes(
  asambleaId: string,
  params: PoderSearchParams,
  limit: number = 10
): Promise<Registro[]> {
  const searchParams = new URLSearchParams();
  
  if (params.torre) searchParams.append("torre", params.torre);
  if (params.apartamento) searchParams.append("apartamento", params.apartamento);
  if (params.numero_control) searchParams.append("numero_control", params.numero_control);
  searchParams.append("limit", limit.toString());

  const endpoint = `/registros/asamblea/${asambleaId}/poderes/buscar?${searchParams.toString()}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Registro[] = await response.json();
      return data;
    }

    throw new Error(`Error al buscar registros para poderes: ${response.status}`);
  } catch (error) {
    console.error("Error al buscar registros para poderes:", error);
    throw error;
  }
}

/**
 * Verifica si un poder existe y retorna el registro que lo tiene
 * 
 * @param asambleaId - ID de la asamblea
 * @param torre - Torre/Bloque
 * @param apartamento - Apto/Casa
 * @param numero_control - Número de control
 * @returns Registro que tiene el poder, o null si no existe
 */
export async function verificarPoder(
  asambleaId: string,
  torre: string,
  apartamento: string,
  numero_control: string
): Promise<Registro | null> {
  const searchParams = new URLSearchParams();
  searchParams.append("torre", torre);
  searchParams.append("apartamento", apartamento);
  searchParams.append("numero_control", numero_control);

  const endpoint = `/registros/asamblea/${asambleaId}/poderes/verificar?${searchParams.toString()}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: Registro = await response.json();
      return data;
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(`Error al verificar poder: ${response.status}`);
  } catch (error) {
    console.error("Error al verificar poder:", error);
    throw error;
  }
}

/** Campos que se pueden actualizar en un registro */
export interface RegistroUpdatePayload {
  cedula?: string;
  nombre?: string;
  telefono?: string | null;
  correo?: string | null;
  numero_torre?: string | null;
  numero_apartamento?: string | null;
  numero_control?: string | null;
  gestion_poderes?: Record<string, any> | null;
  actividad_ingreso?: Record<string, any> | null;
}

/**
 * Actualiza un registro
 *
 * @param registroId - ID del registro
 * @param payload - Campos a actualizar (solo se envían los definidos)
 * @returns Registro actualizado
 */
export async function actualizarRegistro(
  registroId: string,
  payload: RegistroUpdatePayload
): Promise<Registro> {
  const endpoint = `/registros/${registroId}`;

  const body: Record<string, unknown> = {};
  if (payload.cedula !== undefined) body.cedula = payload.cedula;
  if (payload.nombre !== undefined) body.nombre = payload.nombre;
  if (payload.telefono !== undefined) body.telefono = payload.telefono;
  if (payload.correo !== undefined) body.correo = payload.correo;
  if (payload.numero_torre !== undefined) body.numero_torre = payload.numero_torre;
  if (payload.numero_apartamento !== undefined) body.numero_apartamento = payload.numero_apartamento;
  if (payload.numero_control !== undefined) body.numero_control = payload.numero_control;
  if (payload.gestion_poderes !== undefined) body.gestion_poderes = payload.gestion_poderes;
  if (payload.actividad_ingreso !== undefined) body.actividad_ingreso = payload.actividad_ingreso;

  try {
    const response = await apiFetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data: Registro = await response.json();
      return data;
    }

    throw new Error(`Error al actualizar registro: ${response.status}`);
  } catch (error) {
    console.error("Error al actualizar registro:", error);
    throw error;
  }
}

/**
 * Transfiere un poder de un registro a otro
 * 
 * @param asambleaId - ID de la asamblea
 * @param params - Parámetros de transferencia
 * @returns Resultado de la transferencia
 */
export async function transferirPoder(
  asambleaId: string,
  params: TransferirPoderParams
): Promise<{ registro_origen: Registro; registro_destino: Registro; message: string }> {
  const endpoint = `/registros/asamblea/${asambleaId}/poderes/transferir`;

  try {
    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    throw new Error(`Error al transferir poder: ${response.status}`);
  } catch (error) {
    console.error("Error al transferir poder:", error);
    throw error;
  }
}

/**
 * Obtiene el coeficiente del dueño original de un poder
 * 
 * @param asambleaId - ID de la asamblea
 * @param torre - Torre/Bloque
 * @param apartamento - Apto/Casa
 * @param numero_control - Número de control
 * @returns Coeficiente del dueño original o null
 */
export async function obtenerCoeficientePoder(
  asambleaId: string,
  torre: string,
  apartamento: string,
  numero_control: string
): Promise<number | null> {
  const searchParams = new URLSearchParams();
  searchParams.append("torre", torre);
  searchParams.append("apartamento", apartamento);
  searchParams.append("numero_control", numero_control);

  const endpoint = `/registros/asamblea/${asambleaId}/poderes/coeficiente?${searchParams.toString()}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      return data.encontrado ? (data.coeficiente || null) : null;
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(`Error al obtener coeficiente: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener coeficiente del poder:", error);
    return null;
  }
}

/**
 * Verifica si un número de control ya está asignado a otro registro
 * 
 * @param asambleaId - ID de la asamblea
 * @param numero_control - Número de control a verificar
 * @param registroIdExcluir - ID del registro a excluir de la verificación (opcional)
 * @returns true si el control ya está asignado, false si no
 */
export async function verificarControlExistente(
  asambleaId: string,
  numero_control: string,
  registroIdExcluir?: string
): Promise<{ existe: boolean; registro: Registro | null }> {
  const searchParams = new URLSearchParams();
  searchParams.append("numero_control", numero_control);
  if (registroIdExcluir) {
    searchParams.append("registro_id_excluir", registroIdExcluir);
  }

  const endpoint = `/registros/asamblea/${asambleaId}/control/verificar?${searchParams.toString()}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    throw new Error(`Error al verificar control: ${response.status}`);
  } catch (error) {
    console.error("Error al verificar control:", error);
    throw error;
  }
}

/**
 * Devuelve un poder a su dueño original
 * 
 * @param asambleaId - ID de la asamblea
 * @param params - Parámetros de devolución
 * @returns Resultado de la devolución
 */
export async function devolverPoder(
  asambleaId: string,
  params: DevolverPoderParams
): Promise<{ registro_actual: Registro; dueno_original: Registro; message: string }> {
  const endpoint = `/registros/asamblea/${asambleaId}/poderes/devolver`;

  try {
    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    throw new Error(`Error al devolver poder: ${response.status}`);
  } catch (error) {
    console.error("Error al devolver poder:", error);
    throw error;
  }
}
