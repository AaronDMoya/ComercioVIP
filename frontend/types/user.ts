/**
 * Tipos relacionados con usuarios
 */

/**
 * Datos para crear un nuevo usuario
 */
export interface UserCreate {
    name: string;
    last_name: string;
    username: string;
    password: string;
    is_admin?: boolean;
}

/**
 * Respuesta del servidor al crear/obtener un usuario
 */
export interface UserResponse {
    id: string;
    name: string;
    last_name: string;
    username: string;
    is_active: boolean;
    is_admin: boolean;
}

/**
 * Datos de un operario/usuario en la tabla
 */
export interface Operario {
    nombre: string;
    rol: string;
    estado: "Activo" | "Inactivo" | "Suspendido";
    avatar?: string;
}
