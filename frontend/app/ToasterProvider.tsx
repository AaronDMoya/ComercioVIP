"use client";

import { Toaster } from "sonner";

/**
 * Provider de notificaciones toast personalizado
 * 
 * Estilo adaptado al diseño de la aplicación:
 * - Fondo blanco con bordes redondeados (rounded-lg)
 * - Sombras sutiles consistentes con el diseño (shadow-lg)
 * - Bordes de colores según el tipo de notificación
 * - Colores que coinciden con el tema (azul para acciones principales)
 * - Posición superior centrada para mejor visibilidad
 * 
 * Los estilos CSS personalizados se encuentran en globals.css
 * bajo la capa @layer components
 */
export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      richColors={false}
      expand={true}
      closeButton
      offset={16}
      gap={8}
    />
  );
}
