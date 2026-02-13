import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Componente Container que replica el estilo del Card
 * 
 * Características:
 * - Fondo blanco (bg-card)
 * - Texto con color de card-foreground
 * - Esquinas redondeadas (rounded-xl)
 * - Sombra sutil (shadow-sm)
 * - Borde opcional
 * - Padding vertical (py-6)
 * - Flexbox con gap
 */
function Container({ 
  className, 
  children,
  ...props 
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="container"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm transition-smooth hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Container }
