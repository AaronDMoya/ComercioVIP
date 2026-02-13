"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAsambleas, type Asamblea } from "@/lib/services/asambleaService";
import { toast } from "sonner";

/**
 * Tipo que define la interfaz del contexto de asamblea
 */
export type AsambleaContextType = {
  asambleaSeleccionada: Asamblea | null;
  asambleasActivas: Asamblea[];
  isLoading: boolean;
  seleccionarAsamblea: (asamblea: Asamblea | null) => void;
  recargarAsambleas: () => Promise<void>;
};

// Crear el contexto de asamblea
const AsambleaContext = createContext<AsambleaContextType>(null!);

/**
 * Provider que envuelve las páginas de operarios y proporciona el contexto de asamblea
 * 
 * Funcionalidades:
 * - Mantiene el estado de la asamblea seleccionada
 * - Carga automáticamente las asambleas activas al montar el componente
 * - Proporciona funciones para seleccionar y recargar asambleas
 * 
 * @param children - Componentes hijos que tendrán acceso al contexto
 */
export function AsambleaProvider({ children }: { children: ReactNode }) {
  const [asambleaSeleccionada, setAsambleaSeleccionada] = useState<Asamblea | null>(null);
  const [asambleasActivas, setAsambleasActivas] = useState<Asamblea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Función que carga las asambleas activas desde el servidor
   */
  const recargarAsambleas = async () => {
    setIsLoading(true);
    try {
      const response = await getAsambleas({
        estado: "ACTIVA",
        limit: 100,
      });
      setAsambleasActivas(response.asambleas);
    } catch (error) {
      console.error("Error al cargar asambleas activas:", error);
      toast.error("Error al cargar las asambleas activas");
      setAsambleasActivas([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Función para seleccionar una asamblea
   * Guarda la selección en localStorage para persistencia
   */
  const seleccionarAsamblea = (asamblea: Asamblea | null) => {
    setAsambleaSeleccionada(asamblea);
    if (asamblea) {
      localStorage.setItem("asambleaSeleccionada", JSON.stringify(asamblea));
    } else {
      localStorage.removeItem("asambleaSeleccionada");
    }
  };

  /**
   * Efecto que se ejecuta una vez al montar el componente
   * Carga las asambleas activas y restaura la selección guardada
   */
  useEffect(() => {
    const cargarDatos = async () => {
      await recargarAsambleas();

      // Intentar restaurar la asamblea seleccionada desde localStorage
      try {
        const asambleaGuardada = localStorage.getItem("asambleaSeleccionada");
        if (asambleaGuardada) {
          const asamblea = JSON.parse(asambleaGuardada) as Asamblea;
          // Verificar que la asamblea guardada sigue siendo activa
          const response = await getAsambleas({
            estado: "ACTIVA",
            limit: 100,
          });
          const asambleaExiste = response.asambleas.find((a) => a.id === asamblea.id);
          if (asambleaExiste) {
            setAsambleaSeleccionada(asambleaExiste);
          } else {
            // Si la asamblea guardada ya no está activa, limpiar la selección
            localStorage.removeItem("asambleaSeleccionada");
          }
        }
      } catch (error) {
        console.error("Error al restaurar asamblea seleccionada:", error);
        localStorage.removeItem("asambleaSeleccionada");
      }
    };

    cargarDatos();
  }, []);

  // Proporciona el contexto a todos los componentes hijos
  return (
    <AsambleaContext.Provider
      value={{
        asambleaSeleccionada,
        asambleasActivas,
        isLoading,
        seleccionarAsamblea,
        recargarAsambleas,
      }}
    >
      {children}
    </AsambleaContext.Provider>
  );
}

/**
 * Hook personalizado para acceder al contexto de asamblea
 * 
 * Uso:
 * const { asambleaSeleccionada, seleccionarAsamblea } = useAsamblea();
 * 
 * @returns El contexto de asamblea con asambleaSeleccionada, asambleasActivas, etc.
 */
export const useAsamblea = () => useContext(AsambleaContext);
