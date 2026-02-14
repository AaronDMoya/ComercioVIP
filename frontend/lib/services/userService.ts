import { apiFetch } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  last_name: string;
  username: string;
  is_admin: boolean;
}

export interface UsersResponse {
  users: User[];
  total: number;
}

export interface GetUsersParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_admin?: boolean;
}

/**
 * Obtiene la lista de usuarios con filtros opcionales
 * 
 * @param params - Parámetros de búsqueda y filtrado
 * @returns Lista de usuarios y total de registros
 */
export async function getUsers(params: GetUsersParams = {}): Promise<UsersResponse> {
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
  if (params.is_admin !== undefined) {
    queryParams.append("is_admin", params.is_admin.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await apiFetch(endpoint, {
      method: "GET",
    });

    if (response.ok) {
      const data: UsersResponse = await response.json();
      return data;
    }

    throw new Error(`Error al obtener usuarios: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    throw error;
  }
}

/**
 * Elimina un usuario por ID
 * 
 * @param userId - ID del usuario a eliminar
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await apiFetch(`/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `Error al eliminar usuario: ${response.status}`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    throw error;
  }
}