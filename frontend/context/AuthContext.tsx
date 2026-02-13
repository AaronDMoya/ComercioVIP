"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { User, LoginResult, AuthContextType } from "@/types/auth";

// Crear el contexto de autenticación
// null! indica que el valor por defecto es null pero TypeScript lo acepta
const AuthContext = createContext<AuthContextType>(null!);

/**
 * Provider que envuelve la aplicación y proporciona el contexto de autenticación
 * 
 * Funcionalidades:
 * - Mantiene el estado del usuario autenticado
 * - Carga automáticamente el usuario al montar el componente
 * - Proporciona funciones de login y logout
 * 
 * @param children - Componentes hijos que tendrán acceso al contexto
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Estado que almacena el usuario actual (null si no está autenticado)
    const [user, setUser] = useState<User | null>(null);

    /**
     * Función que carga la información del usuario actual desde el servidor
     * Hace una petición GET a /auth/me para verificar si hay una sesión activa
     */
    async function loadUser() {
        try {
            const response = await apiFetch("/auth/me");
            if (response.ok) {
                // Si la respuesta es exitosa, actualiza el estado con los datos del usuario
                setUser(await response.json());
            } else if (response.status === 401) {
                // Si la sesión ha expirado, limpiar el estado del usuario
                // El evento de sesión expirada se manejará en el useEffect
                setUser(null);
            }
            // Si la respuesta no es ok y no es 401, el usuario permanece null (no autenticado)
        } catch (error) {
            // Silenciosamente falla si no hay conexión o el usuario no está autenticado
            // Esto es normal cuando el usuario no ha iniciado sesión
            console.debug("No se pudo cargar el usuario:", error);
            setUser(null);
        }
    }

    /**
     * Efecto que se ejecuta una vez al montar el componente
     * Intenta cargar el usuario si hay una sesión activa (cookie válida)
     */
    useEffect(() => {
        loadUser();
    }, []);

    /**
     * Efecto que escucha eventos de sesión expirada
     * Cuando se detecta un 401 en cualquier petición, limpia el estado del usuario
     * y redirige al login
     */
    useEffect(() => {
        const handleSessionExpired = () => {
            // Limpiar el estado del usuario
            setUser(null);
            // Redirigir al login solo si no estamos ya en la página de login
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        };

        // Escuchar el evento de sesión expirada
        window.addEventListener("session-expired", handleSessionExpired);

        // Limpiar el listener al desmontar
        return () => {
            window.removeEventListener("session-expired", handleSessionExpired);
        };
    }, []);

    /**
     * Función para iniciar sesión
     * 
     * @param username - Nombre de usuario
     * @param password - Contraseña
     * @returns Objeto con success y opcionalmente un mensaje de error
     */
    async function login(username: string, password: string): Promise<LoginResult> {
        try {
            // Envía las credenciales al servidor
            const response = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                // Si el login fue exitoso, carga los datos del usuario
                await loadUser();
                return { success: true };
            }

            // Si el login falló, intenta obtener el mensaje de error del servidor
            let errorMessage = "Usuario o contraseña incorrectos";
            
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    // Mapear mensajes del backend a mensajes más amigables
                    if (errorData.detail.includes("Invalid username or password")) {
                        errorMessage = "Usuario o contraseña incorrectos";
                    } else if (errorData.detail.includes("not active")) {
                        errorMessage = "Tu cuenta está desactivada. Contacta al administrador";
                    } else {
                        errorMessage = errorData.detail;
                    }
                }
            } catch {
                // Si no se puede parsear el JSON, usar el mensaje por defecto
                if (response.status === 401) {
                    errorMessage = "Usuario o contraseña incorrectos";
                } else if (response.status === 403) {
                    errorMessage = "Tu cuenta está desactivada. Contacta al administrador";
                } else {
                    errorMessage = "Error al iniciar sesión. Intenta nuevamente.";
                }
            }

            return { success: false, error: errorMessage };
        } catch (error) {
            // Error de red o conexión
            console.error("Error en login:", error);
            return { 
                success: false, 
                error: "Error de conexión. Verifica que el servidor esté disponible." 
            };
        }
    }

    /**
     * Función para cerrar sesión
     * Envía una petición al servidor para invalidar la sesión
     * y limpia el estado del usuario localmente
     */
    async function logout() {
        const response = await apiFetch("/auth/logout", { method: "POST" });
        // Limpia el estado del usuario independientemente de la respuesta
        setUser(null);
    }

    // Proporciona el contexto a todos los componentes hijos
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook personalizado para acceder al contexto de autenticación
 * 
 * Uso:
 * const { user, login, logout } = useAuth();
 * 
 * @returns El contexto de autenticación con user, login y logout
 */
export const useAuth = () => useContext(AuthContext);