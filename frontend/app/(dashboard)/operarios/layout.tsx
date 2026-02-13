"use client";

import { AsambleaProvider } from "@/context/AsambleaContext";
import AsambleaSelector from "./components/AsambleaSelector";
import { useAsamblea } from "@/context/AsambleaContext";
import { AlertCircle } from "lucide-react";

function OperariosContent({ children }: { children: React.ReactNode }) {
  const { asambleaSeleccionada, asambleasActivas, isLoading } = useAsamblea();

  // Si está cargando, mostrar un mensaje de carga
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando asambleas activas...</p>
        </div>
      </div>
    );
  }

  // Si no hay asambleas activas, mostrar un mensaje
  if (asambleasActivas.length === 0) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <AsambleaSelector />
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          <div className="text-center p-8 bg-gray-50 rounded-lg border max-w-md">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No hay asambleas activas
            </h2>
            <p className="text-gray-600">
              No se encontraron asambleas activas. Debe haber al menos una asamblea activa para acceder a las funciones de operario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay asamblea seleccionada, mostrar el selector y un mensaje
  if (!asambleaSeleccionada) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <AsambleaSelector />
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 max-w-md shadow-sm">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Selecciona una asamblea activa
            </h2>
            <p className="text-gray-600">
              Por favor, selecciona una asamblea activa de la lista superior para acceder a las funciones de operario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si hay asamblea seleccionada, mostrar el selector y el contenido
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <AsambleaSelector />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function OperariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full">
      <AsambleaProvider>
        <OperariosContent>{children}</OperariosContent>
      </AsambleaProvider>
    </div>
  );
}
