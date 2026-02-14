"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getRegistros, type Registro } from "@/lib/services/registroService";
import { toast } from "sonner";
import { useAsamblea } from "@/context/AsambleaContext";

export default function RegistrosTable() {
  const { asambleaSeleccionada } = useAsamblea();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar registros
  useEffect(() => {
    const loadRegistros = async () => {
      if (!asambleaSeleccionada?.id) {
        setIsLoading(false);
        setRegistros([]);
        return;
      }

      setIsLoading(true);
      try {
        console.log("Cargando registros para asamblea:", asambleaSeleccionada.id);
        const data = await getRegistros(asambleaSeleccionada.id);
        console.log("Registros cargados:", data.length);
        setRegistros(data);
      } catch (error) {
        console.error("Error al cargar registros:", error);
        toast.error("Error al cargar los registros");
        setRegistros([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRegistros();
  }, [asambleaSeleccionada?.id]); // Usar solo el ID para detectar cambios
  // Función para formatear JSON
  const formatJson = (data: Record<string, any> | null): string => {
    if (!data) return "-";
    return JSON.stringify(data, null, 2);
  };

  // Función para obtener el número de poderes y formatear la información
  // Maneja el nuevo formato anidado: {"poder_1": {...}, "poder_2": {...}, ...}
  const getPoderesInfo = (gestionPoderes: Record<string, any> | any[] | null) => {
    if (!gestionPoderes) {
      return { count: 0, details: [] };
    }

    // Si gestion_poderes es un array
    if (Array.isArray(gestionPoderes)) {
      return {
        count: gestionPoderes.length,
        details: gestionPoderes.map((poder, index) => ({
          index: index + 1,
          torre: poder.torre || poder.numero_torre || "-",
          apartamento: poder.apartamento || poder.numero_apartamento || "-",
          numero_control: poder.numero_control || "-",
        })),
      };
    }

    // Si gestion_poderes es un objeto
    const keys = Object.keys(gestionPoderes);
    
    // Verificar si tiene formato nuevo anidado (poder_1, poder_2, etc.)
    const poderKeys = keys.filter(key => key.startsWith('poder_'));
    if (poderKeys.length > 0) {
      // Ordenar las claves numéricamente (poder_1, poder_2, etc.)
      poderKeys.sort((a, b) => {
        const numA = parseInt(a.replace('poder_', '')) || 0;
        const numB = parseInt(b.replace('poder_', '')) || 0;
        return numA - numB;
      });
      
      const details = poderKeys.map((key, index) => {
        const poder = gestionPoderes[key];
        return {
          index: index + 1,
          torre: poder?.torre || poder?.numero_torre || "-",
          apartamento: poder?.apartamento || poder?.numero_apartamento || "-",
          numero_control: poder?.numero_control || "-",
        };
      });
      
      return {
        count: poderKeys.length,
        details: details,
      };
    }

    // Compatibilidad con formato antiguo (plano)
    // Verificar si tiene las propiedades directamente
    if (gestionPoderes.torre || gestionPoderes.apartamento || gestionPoderes.numero_control) {
      return {
        count: 1,
        details: [
          {
            index: 1,
            torre: gestionPoderes.torre || gestionPoderes.numero_torre || "-",
            apartamento: gestionPoderes.apartamento || gestionPoderes.numero_apartamento || "-",
            numero_control: gestionPoderes.numero_control || "-",
          },
        ],
      };
    }

    // Si no tiene estructura conocida, retornar vacío
    return {
      count: 0,
      details: [],
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No se encontraron registros para esta asamblea.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table className="w-full min-w-[1000px]">
        <TableHeader>
          <TableRow className="h-10 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 hover:bg-gray-100/50">
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 text-center">#</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Cédula</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider max-w-[200px]">Nombre</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Teléfono</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">N° Torre</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">N° Apt</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">N° Control</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Coeficiente</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actividad</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Poderes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((registro, index) => (
            <TableRow
              key={registro.id}
              className="h-auto border-b border-gray-100 transition-colors duration-150 hover:bg-blue-50/50 hover:shadow-sm animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
            >
              <TableCell className="py-2.5 px-4 text-xs text-center text-gray-500 font-medium bg-gray-50/30">{index + 1}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs font-semibold text-gray-900">{registro.cedula}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs text-gray-800 max-w-[200px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block truncate cursor-help">{registro.nombre}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{registro.nombre}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="py-2.5 px-4 text-xs text-gray-600">{registro.telefono || <span className="text-gray-400">-</span>}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs text-gray-600">{registro.numero_torre || <span className="text-gray-400">-</span>}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs text-gray-600">{registro.numero_apartamento || <span className="text-gray-400">-</span>}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs text-gray-600">{registro.numero_control || <span className="text-gray-400">-</span>}</TableCell>
              <TableCell className="py-2.5 px-4 text-xs">
                {registro.coeficiente !== null ? (
                  <span className="font-medium text-blue-600">{registro.coeficiente.toFixed(4)}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-2.5 px-4 max-w-xs">
                <pre className="text-xs whitespace-pre-wrap break-words m-0 text-gray-700 bg-gray-50/50 p-1.5 rounded border border-gray-200">
                  {formatJson(registro.actividad_ingreso)}
                </pre>
              </TableCell>
              <TableCell className="py-2.5 px-4">
                {(() => {
                  const poderesInfo = getPoderesInfo(registro.gestion_poderes);
                  if (poderesInfo.count === 0) {
                    return <span className="text-xs text-gray-400">-</span>;
                  }
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:text-blue-700 cursor-help bg-blue-50 hover:bg-blue-100 transition-colors duration-150 border border-blue-200">
                          {poderesInfo.count} {poderesInfo.count === 1 ? "poder" : "poderes"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm bg-gray-900 text-white border-gray-700">
                        <div className="space-y-2">
                          <div className="font-semibold mb-2 text-white">Gestión de Poderes:</div>
                          {poderesInfo.details.map((poder) => (
                            <div key={poder.index} className="text-xs space-y-1 border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                              <div><span className="font-medium text-blue-300">Poder {poder.index}:</span></div>
                              <div className="pl-2 space-y-0.5 text-gray-300">
                                <div>Torre: <span className="text-white">{poder.torre}</span></div>
                                <div>Apartamento: <span className="text-white">{poder.apartamento}</span></div>
                                <div>Número Control: <span className="text-white">{poder.numero_control}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
