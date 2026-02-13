/**
 * Tipos relacionados con gráficos y visualizaciones
 */

import * as React from "react";

/**
 * Configuración para gráficos
 */
export type ChartConfig = {
    [k in string]: {
        label?: React.ReactNode;
        icon?: React.ComponentType;
    } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<"light" | "dark", string> }
    );
};

/**
 * Props del contexto de gráficos (uso interno del componente Chart)
 */
export type ChartContextProps = {
    config: ChartConfig;
};
