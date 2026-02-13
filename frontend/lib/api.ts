// URL base de la API obtenida de las variables de entorno
// En Next.js, las variables de entorno del cliente deben comenzar con NEXT_PUBLIC_
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://comerciovip.com/api";

/**
 * Función helper para realizar peticiones HTTP a la API
 * 
 * @param endpoint - Ruta del endpoint (ej: "/auth/login")
 * @param options - Opciones de fetch (method, body, headers, etc.)
 * @returns Promise con la respuesta de fetch
 * 
 * Características:
 * - Incluye automáticamente las credenciales (cookies) en cada petición
 * - Establece el Content-Type como application/json por defecto
 * - Permite sobrescribir headers si se pasan en options
 * - Combina la URL base con el endpoint proporcionado
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    // Validar que API_URL esté definido
    if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL no está configurado. Por favor, configura la variable de entorno.");
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            // credentials: "include" permite enviar cookies automáticamente
            // Esto es necesario para mantener la sesión del usuario
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // Permite agregar headers adicionales o sobrescribir los existentes
                ...(options.headers || {}),
            },
            // Spread de options permite pasar method, body, etc.
            ...options,
        });

        // Si la respuesta es 401 (Unauthorized), significa que la sesión ha expirado
        // Disparamos un evento personalizado para que el AuthContext lo maneje
        if (res.status === 401 && !endpoint.includes("/auth/login")) {
            // Disparar evento de sesión expirada
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("session-expired"));
            }
        }

        return res;
    } catch (error) {
        // Mejorar el mensaje de error para debugging
        console.error(`Error al hacer fetch a ${API_URL}${endpoint}:`, error);
        throw error;
    }
}