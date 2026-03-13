// URL base de la API obtenida de las variables de entorno
// En Next.js, las variables de entorno del cliente deben comenzar con NEXT_PUBLIC_
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://comerciovip.com/api";

const AUTH_TOKEN_KEY = "access_token";

/** Guarda el token para enviarlo en el header Authorization (funciona en cross-origin) */
export function setAuthToken(token: string | null) {
    if (typeof window === "undefined") return;
    if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
}

/** Obtiene el token guardado (solo en cliente) */
export function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

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

    const fullUrl = `${API_URL}${endpoint}`;

    const token = getAuthToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(fullUrl, {
            // credentials: "include" permite enviar cookies (mismo origen)
            credentials: "include",
            headers,
            // Spread de options permite pasar method, body, etc.
            ...options,
        });

        // Si la respuesta es 401 (Unauthorized), sesión expirada. Solo redirigir en rutas que requieren login.
        // Las rutas /update-users/* son públicas (ingreso por torre/apt o token), no deben redirigir a login.
        if (res.status === 401 && !endpoint.includes("/auth/login")) {
            if (typeof window !== "undefined") {
                const pathname = window.location.pathname || "";
                if (!pathname.startsWith("/update-users")) {
                    window.dispatchEvent(new CustomEvent("session-expired"));
                }
            }
        }

        return res;
    } catch (error) {
        // Mejorar el mensaje de error para debugging
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        
        // Verificar si es un error de conexión
        if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
            console.error(`❌ Error de conexión al intentar acceder a: ${fullUrl}`);
            console.error(`🔍 Verifica que:`);
            console.error(`   1. El backend esté corriendo en ${API_URL}`);
            console.error(`   2. La URL sea correcta (actual: ${API_URL})`);
            console.error(`   3. No haya problemas de CORS`);
            console.error(`   4. El endpoint exista: ${endpoint}`);
            
            throw new Error(
                `No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ${API_URL}`
            );
        }
        
        console.error(`Error al hacer fetch a ${fullUrl}:`, error);
        throw error;
    }
}