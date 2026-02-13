/**
 * Tipos relacionados con la autenticación
 */

/**
 * Tipo que define la estructura de un usuario autenticado
 */
export type User = {
    sub: string;        // Subject (identificador único del usuario)
    is_admin: boolean;  // Indica si el usuario tiene permisos de administrador
    name?: string;      // Nombre del usuario
    last_name?: string; // Apellido del usuario
    username?: string;  // Nombre de usuario
};

/**
 * Tipo que define el resultado de un intento de login
 */
export type LoginResult = {
    success: boolean;
    error?: string;  // Mensaje de error específico
};

/**
 * Tipo que define la interfaz del contexto de autenticación
 * Proporciona el estado del usuario y funciones para login/logout
 */
export type AuthContextType = {
    user: User | null;  // Usuario actual (null si no está autenticado)
    login: (username: string, password: string) => Promise<LoginResult>;  // Función para iniciar sesión
    logout: () => Promise<void>;  // Función para cerrar sesión
};
