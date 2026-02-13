"use client";

import { useAsamblea } from "@/context/AsambleaContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AsambleaSelector() {
  const {
    asambleaSeleccionada,
    asambleasActivas,
    isLoading,
    seleccionarAsamblea,
    recargarAsambleas,
  } = useAsamblea();

  // Si está cargando, mostrar un indicador
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-600">Cargando asambleas activas...</span>
      </div>
    );
  }

  // Si no hay asambleas activas, mostrar un mensaje
  if (asambleasActivas.length === 0) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay asambleas activas</AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex-1 min-w-[200px]">No se encontraron asambleas activas. Debe haber al menos una asamblea activa para acceder a las funciones de operario.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={recargarAsambleas}
            >
              Recargar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mostrar el selector de asamblea
  return (
    <div className="p-4 bg-white border-b shadow-sm flex-shrink-0">
      <div className="flex items-center gap-4">
        <label htmlFor="asamblea-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Asamblea activa:
        </label>
        <Select
          value={asambleaSeleccionada?.id || ""}
          onValueChange={(value) => {
            const asamblea = asambleasActivas.find((a) => a.id === value);
            seleccionarAsamblea(asamblea || null);
          }}
        >
          <SelectTrigger id="asamblea-select" className="w-full max-w-md">
            <SelectValue placeholder="Selecciona una asamblea activa" />
          </SelectTrigger>
          <SelectContent>
            {asambleasActivas.map((asamblea) => (
              <SelectItem key={asamblea.id} value={asamblea.id}>
                {asamblea.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {asambleaSeleccionada && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
              ACTIVA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
