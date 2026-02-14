"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { getAsamblea, updateAsambleaEstado, type Asamblea } from "@/lib/services/asambleaService";
import { getRegistros, type Registro } from "@/lib/services/registroService";
import * as XLSX from "xlsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface AsambleaDetailsDialogProps {
  asambleaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAsambleaUpdated?: () => void;
}

export function AsambleaDetailsDialog({
  asambleaId,
  open,
  onOpenChange,
  onAsambleaUpdated,
}: AsambleaDetailsDialogProps) {
  const [asamblea, setAsamblea] = useState<Asamblea | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Estados para la pestaña de Reportar Control
  const [searchControl, setSearchControl] = useState("");
  const [selectedRegistros, setSelectedRegistros] = useState<Set<string>>(new Set());

  // Cargar datos de la asamblea cuando se abre el dialog
  useEffect(() => {
    if (asambleaId && open) {
      loadAsambleaData();
    } else {
      setAsamblea(null);
      setRegistros([]);
    }
  }, [asambleaId, open]);

  const loadAsambleaData = async () => {
    if (!asambleaId) return;

    setIsLoading(true);
    try {
      const [asambleaData, registrosData] = await Promise.all([
        getAsamblea(asambleaId),
        getRegistros(asambleaId),
      ]);

      setAsamblea(asambleaData);
      setRegistros(registrosData);
    } catch (error) {
      console.error("Error al cargar datos de la asamblea:", error);
      toast.error("Error al cargar los datos de la asamblea");
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el siguiente estado permitido
  const getSiguienteEstado = (estadoActual: string): string | null => {
    if (estadoActual === "CREADA") return "ACTIVA";
    if (estadoActual === "ACTIVA") return "CERRADA";
    return null;
  };

  // Obtener el label del estado
  const getEstadoLabel = (estado: string) => {
    const estadoMap: { [key: string]: string } = {
      ACTIVA: "Activa",
      CERRADA: "Finalizada",
      CREADA: "Creada",
    };
    return estadoMap[estado] || estado;
  };

  // Obtener las clases de estado
  const getEstadoClasses = (estado: string) => {
    if (estado === "ACTIVA") {
      return "bg-green-100 text-green-700 font-medium px-3 py-1 rounded-lg";
    } else if (estado === "CERRADA") {
      return "bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-lg";
    } else if (estado === "CREADA") {
      return "bg-blue-100 text-blue-700 font-medium px-3 py-1 rounded-lg";
    }
    return "bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-lg";
  };

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Manejar cambio de estado
  const handleEstadoChange = async () => {
    if (!asamblea) return;

    const siguienteEstado = getSiguienteEstado(asamblea.estado);
    if (!siguienteEstado) {
      toast.error("Este estado no puede ser modificado");
      return;
    }

    setIsUpdating(true);
    try {
      await updateAsambleaEstado(asamblea.id, siguienteEstado);
      toast.success(`Estado actualizado a "${getEstadoLabel(siguienteEstado)}"`);
      await loadAsambleaData();
      if (onAsambleaUpdated) {
        onAsambleaUpdated();
      }
    } catch (error: any) {
      console.error("Error al actualizar estado:", error);
      toast.error(error.message || "Error al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  // Obtener el texto del botón de estado
  const getEstadoButtonText = () => {
    if (!asamblea) return "";
    const siguienteEstado = getSiguienteEstado(asamblea.estado);
    if (siguienteEstado === "ACTIVA") return "Actualizar estado a Activo";
    if (siguienteEstado === "CERRADA") return "Actualizar estado a Finalizado";
    return "";
  };


  // Función auxiliar para obtener el coeficiente de un control específico
  const obtenerCoeficienteControl = (
    registro: Registro,
    numeroControl: string
  ): number | null => {
    // Si el registro tiene este numero_control directamente, usar su coeficiente
    if (registro.numero_control === numeroControl && registro.coeficiente !== null) {
      return registro.coeficiente;
    }

    // Buscar en gestion_poderes si el control viene de un poder
    if (registro.gestion_poderes && typeof registro.gestion_poderes === "object") {
      const poderes = registro.gestion_poderes;
      
      // Buscar el poder que tiene este numero_control
      for (const poderKey in poderes) {
        const poder = poderes[poderKey];
        if (poder && typeof poder === "object" && poder.numero_control === numeroControl) {
          // Buscar el dueño original del poder en los registros
          const torre = poder.torre || poder.numero_torre || "";
          const apartamento = poder.apartamento || poder.numero_apartamento || "";
          
          if (torre && apartamento) {
            // Buscar el registro que tiene estos datos como su poder original
            const duenoOriginal = registros.find((r) => {
              const rTorre = (r.numero_torre || "").trim().toLowerCase();
              const rApartamento = (r.numero_apartamento || "").trim().toLowerCase();
              return rTorre === torre.trim().toLowerCase() && 
                     rApartamento === apartamento.trim().toLowerCase();
            });
            
            if (duenoOriginal && duenoOriginal.coeficiente !== null) {
              return duenoOriginal.coeficiente;
            }
          }
        }
      }
    }

    return null;
  };

  // Exportar a CSV para sistema de controles
  const handleExportCSV = () => {
    if (registros.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    // Filtrar solo registros con controles asignados
    const registrosConControl = registros.filter((r) => {
      // Tiene numero_control directo
      if (r.numero_control) return true;
      
      // O tiene numero_control en algun poder
      if (r.gestion_poderes && typeof r.gestion_poderes === "object") {
        const poderes = r.gestion_poderes;
        for (const poderKey in poderes) {
          const poder = poderes[poderKey];
          if (poder && typeof poder === "object" && poder.numero_control) {
            return true;
          }
        }
      }
      
      return false;
    });

    if (registrosConControl.length === 0) {
      toast.error("No hay registros con controles asignados para exportar");
      return;
    }

    // Crear mapa de nombres únicos para ID NO
    const nombresUsados = new Set<string>();
    const registrosExportar: Array<{
      idNo: number;
      name: string;
      groupNo: string;
      weight: number;
    }> = [];

    let idCounter = 1;

    for (const registro of registrosConControl) {
      const nombre = registro.nombre.trim();
      
      // Si tiene numero_control directo
      if (registro.numero_control) {
        if (!nombresUsados.has(nombre)) {
          nombresUsados.add(nombre);
          const coeficiente = obtenerCoeficienteControl(registro, registro.numero_control);
          if (coeficiente !== null) {
            registrosExportar.push({
              idNo: idCounter++,
              name: nombre,
              groupNo: registro.numero_control,
              weight: coeficiente,
            });
          }
        }
      }

      // Buscar en gestion_poderes
      if (registro.gestion_poderes && typeof registro.gestion_poderes === "object") {
        const poderes = registro.gestion_poderes;
        for (const poderKey in poderes) {
          const poder = poderes[poderKey];
          if (poder && typeof poder === "object" && poder.numero_control) {
            // Solo agregar si el nombre no ha sido usado
            if (!nombresUsados.has(nombre)) {
              nombresUsados.add(nombre);
              const coeficiente = obtenerCoeficienteControl(registro, poder.numero_control);
              if (coeficiente !== null) {
                registrosExportar.push({
                  idNo: idCounter++,
                  name: nombre,
                  groupNo: poder.numero_control,
                  weight: coeficiente,
                });
                // Salir del loop de poderes una vez que encontramos uno válido para este nombre
                break;
              }
            }
          }
        }
      }
    }

    if (registrosExportar.length === 0) {
      toast.error("No se encontraron registros válidos con controles y coeficientes");
      return;
    }

    // Crear headers
    const headers = ["ID NO", "Name", "Group NO", "Weight"];

    // Crear filas
    const rows = registrosExportar.map((item) => [
      item.idNo.toString(),
      item.name,
      item.groupNo,
      item.weight.toString(),
    ]);

    // Convertir a CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${asamblea?.title || "asamblea"}_controles.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Archivo CSV exportado exitosamente");
  };

  // Función para convertir hora a minutos desde medianoche
  const horaAMinutos = (hora: string): number => {
    // Formato esperado: "11:00AM", "2:30PM", etc.
    const match = hora.match(/(\d+):(\d+)(AM|PM)/i);
    if (!match) return 0;

    let horas = parseInt(match[1], 10);
    const minutos = parseInt(match[2], 10);
    const periodo = match[3].toUpperCase();

    if (periodo === "PM" && horas !== 12) {
      horas += 12;
    } else if (periodo === "AM" && horas === 12) {
      horas = 0;
    }

    return horas * 60 + minutos;
  };

  // Función para calcular tiempo presente en minutos
  const calcularTiempoPresente = (actividadIngreso: Record<string, any> | null): number => {
    if (!actividadIngreso || typeof actividadIngreso !== "object") {
      return 0;
    }

    let tiempoTotal = 0;
    let horaEntrada: number | null = null;

    // Ordenar actividades por número (actividad_1, actividad_2, etc.)
    const actividades = Object.keys(actividadIngreso)
      .filter((key) => key.startsWith("actividad_"))
      .sort((a, b) => {
        const numA = parseInt(a.replace("actividad_", ""), 10);
        const numB = parseInt(b.replace("actividad_", ""), 10);
        return numA - numB;
      });

    for (const key of actividades) {
      const actividad = actividadIngreso[key];
      if (!actividad || typeof actividad !== "object") continue;

      const tipo = actividad.tipo?.toLowerCase();
      const hora = actividad.hora;

      if (!tipo || !hora) continue;

      const minutos = horaAMinutos(hora);

      if (tipo === "ingreso" || tipo === "reingreso") {
        // Si ya había una entrada previa sin salida, no contar ese tiempo
        if (horaEntrada !== null) {
          // No contar tiempo si no hubo salida
        }
        horaEntrada = minutos;
      } else if (tipo === "salida" && horaEntrada !== null) {
        // Calcular tiempo entre entrada y salida
        tiempoTotal += minutos - horaEntrada;
        horaEntrada = null;
      }
    }

    // Si quedó una entrada sin salida, no contar ese tiempo (aún está presente)
    // O podrías contar hasta el final del día si prefieres

    return tiempoTotal;
  };

  // Función para formatear minutos a horas y minutos
  const formatearTiempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Exportar a XLSX - Informe Final
  const handleExportXLSX = () => {
    if (registros.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    try {
      // Crear datos para el Excel
      const datos = registros.map((registro) => {
        const tiempoPresente = calcularTiempoPresente(registro.actividad_ingreso);

        return {
          "Cédula": registro.cedula,
          "Nombre": registro.nombre,
          "Teléfono": registro.telefono || "",
          "N° Torre": registro.numero_torre || "",
          "N° Apartamento": registro.numero_apartamento || "",
          "N° Control": registro.numero_control || "",
          "Coeficiente": registro.coeficiente || 0,
          "Tiempo Presente": formatearTiempo(tiempoPresente),
          "Tiempo Presente (minutos)": tiempoPresente,
          "Fecha Creación": formatDate(registro.created_at),
        };
      });

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Crear worksheet
      const ws = XLSX.utils.json_to_sheet(datos);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 15 }, // Cédula
        { wch: 30 }, // Nombre
        { wch: 15 }, // Teléfono
        { wch: 10 }, // N° Torre
        { wch: 15 }, // N° Apartamento
        { wch: 12 }, // N° Control
        { wch: 12 }, // Coeficiente
        { wch: 18 }, // Tiempo Presente
        { wch: 22 }, // Tiempo Presente (minutos)
        { wch: 20 }, // Fecha Creación
      ];
      ws["!cols"] = colWidths;

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Registros");

      // Agregar hoja de resumen
      const totalRegistros = registros.length;
      const totalCoeficiente = registros.reduce((sum, r) => sum + (r.coeficiente || 0), 0);
      const totalTiempoPresente = registros.reduce(
        (sum, r) => sum + calcularTiempoPresente(r.actividad_ingreso),
        0
      );
      const registrosConControl = registros.filter((r) => r.numero_control).length;

      const resumen = [
        { "Concepto": "Total de Registros", "Valor": totalRegistros },
        { "Concepto": "Registros con Control", "Valor": registrosConControl },
        { "Concepto": "Total Coeficiente", "Valor": totalCoeficiente.toFixed(4) },
        { "Concepto": "Tiempo Total Presente", "Valor": formatearTiempo(totalTiempoPresente) },
        { "Concepto": "Tiempo Promedio Presente", "Valor": formatearTiempo(Math.round(totalTiempoPresente / totalRegistros)) },
      ];

      const wsResumen = XLSX.utils.json_to_sheet(resumen);
      wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // Descargar archivo
      XLSX.writeFile(wb, `${asamblea?.title || "asamblea"}_informe_final.xlsx`);

      toast.success("Archivo XLSX exportado exitosamente");
    } catch (error) {
      console.error("Error al exportar XLSX:", error);
      toast.error("Error al exportar el archivo XLSX");
    }
  };

  // Función para obtener registros con controles
  const getRegistrosConControl = () => {
    return registros.filter((r) => {
      if (r.numero_control) return true;
      if (r.gestion_poderes && typeof r.gestion_poderes === "object") {
        const poderes = r.gestion_poderes;
        for (const poderKey in poderes) {
          const poder = poderes[poderKey];
          if (poder && typeof poder === "object" && poder.numero_control) {
            return true;
          }
        }
      }
      return false;
    });
  };

  // Función para obtener el número de control de un registro
  const getNumeroControl = (registro: Registro): string => {
    if (registro.numero_control) return registro.numero_control;
    if (registro.gestion_poderes && typeof registro.gestion_poderes === "object") {
      const poderes = registro.gestion_poderes;
      for (const poderKey in poderes) {
        const poder = poderes[poderKey];
        if (poder && typeof poder === "object" && poder.numero_control) {
          return poder.numero_control;
        }
      }
    }
    return "";
  };


  // Manejar selección de registros
  const handleToggleRegistro = (registroId: string) => {
    const newSelected = new Set(selectedRegistros);
    if (newSelected.has(registroId)) {
      newSelected.delete(registroId);
    } else {
      newSelected.add(registroId);
    }
    setSelectedRegistros(newSelected);
  };

  // Manejar selección de todos
  const handleSelectAll = (checked: boolean) => {
    const registrosConControl = getRegistrosConControl();
    const registrosFiltrados = registrosConControl.filter((r) => {
      if (!searchControl.trim()) return true;
      const control = getNumeroControl(r);
      return control.toLowerCase().includes(searchControl.toLowerCase());
    });

    if (checked) {
      setSelectedRegistros(new Set(registrosFiltrados.map((r) => r.id)));
    } else {
      setSelectedRegistros(new Set());
    }
  };

  // Manejar envío de reporte
  const handleEnviarReporte = () => {
    if (selectedRegistros.size === 0) {
      toast.error("Debes seleccionar al menos un registro");
      return;
    }
    toast.info("Funcionalidad en desarrollo");
  };

  // Renderizar pestaña de Reportar Control
  const renderReportarControlTab = () => {
    // Verificar que la asamblea esté finalizada
    if (!asamblea || asamblea.estado !== "CERRADA") {
      return (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-2">Asamblea no finalizada</p>
          <p className="text-sm">
            Esta funcionalidad solo está disponible cuando la asamblea esté finalizada.
          </p>
        </div>
      );
    }

    const registrosConControl = getRegistrosConControl();

    // Filtrar registros por búsqueda de control
    const registrosFiltrados = registrosConControl.filter((r) => {
      if (!searchControl.trim()) return true;
      const control = getNumeroControl(r);
      return control.toLowerCase().includes(searchControl.toLowerCase());
    });

    if (registrosConControl.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay registros con controles asignados
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Reportar Control
          </h3>
          <Button
            onClick={handleEnviarReporte}
            disabled={selectedRegistros.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Reporte ({selectedRegistros.size})
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="w-full">
          <InputGroup>
            <InputGroupInput
              placeholder="Buscar por número de control"
              value={searchControl}
              onChange={(e) => setSearchControl(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRegistros.size === registrosFiltrados.length && registrosFiltrados.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>N° Control</TableHead>
                <TableHead>Coeficiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No se encontraron registros con el control buscado
                  </TableCell>
                </TableRow>
              ) : (
                registrosFiltrados.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRegistros.has(registro.id)}
                        onCheckedChange={() => handleToggleRegistro(registro.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{registro.nombre}</TableCell>
                    <TableCell>{registro.cedula}</TableCell>
                    <TableCell>{getNumeroControl(registro)}</TableCell>
                    <TableCell>{registro.coeficiente || "N/A"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const siguienteEstado = asamblea ? getSiguienteEstado(asamblea.estado) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Detalles de la Asamblea
            </DialogTitle>
            <DialogDescription>
              Gestiona la información y estado de la asamblea
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : asamblea ? (
            <Tabs defaultValue="informacion" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="informacion">Información</TabsTrigger>
                <TabsTrigger value="estado">Estado</TabsTrigger>
                <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
                <TabsTrigger value="exportar">Exportar</TabsTrigger>
                <TabsTrigger 
                  value="reportar" 
                  disabled={asamblea.estado !== "CERRADA"}
                  className={asamblea.estado !== "CERRADA" ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Reportar Control
                </TabsTrigger>
              </TabsList>

              {/* Pestaña: Información */}
              <TabsContent value="informacion" className="space-y-4 mt-6">
                <div className="space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                    Información General
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Título */}
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{asamblea.title}</p>
                    </div>

                    {/* Descripción */}
                    <div>
                      <p className="text-base text-gray-700">
                        {asamblea.description || "Sin descripción"}
                      </p>
                    </div>

                    {/* Detalles en horizontal */}
                    <div className="flex flex-wrap gap-6 pt-2">
                      <div className="space-y-1">
                        <FieldLabel className="text-sm font-medium text-gray-500">Estado</FieldLabel>
                        <div className="mt-1">
                          <span className={getEstadoClasses(asamblea.estado)}>
                            {getEstadoLabel(asamblea.estado)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel className="text-sm font-medium text-gray-500">Creada por</FieldLabel>
                        <p className="text-base text-gray-900">{asamblea.created_by}</p>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel className="text-sm font-medium text-gray-500">Fecha de Creación</FieldLabel>
                        <p className="text-base text-gray-900">
                          {formatDate(asamblea.created_at)}
                        </p>
                      </div>
                      {asamblea.fecha_final && (
                        <div className="space-y-1">
                          <FieldLabel className="text-sm font-medium text-gray-500">Fecha Final</FieldLabel>
                          <p className="text-base text-gray-900">
                            {formatDate(asamblea.fecha_final)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pestaña: Estado */}
              <TabsContent value="estado" className="space-y-4 mt-6">
                {siguienteEstado ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                      Cambiar Estado
                    </h3>
                    <div className="flex items-center justify-center py-8">
                      <Button
                        onClick={handleEstadoChange}
                        disabled={isUpdating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium"
                        size="lg"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Actualizando...
                          </>
                        ) : (
                          getEstadoButtonText()
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Esta asamblea no puede cambiar de estado
                  </div>
                )}
              </TabsContent>

              {/* Pestaña: Estadísticas */}
              <TabsContent value="estadisticas" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                    Estadísticas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">Total de Registros</p>
                      <p className="text-3xl font-bold text-gray-900">{registros.length}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">Registros con Coeficiente</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {registros.filter((r) => r.coeficiente !== null).length}
                      </p>
                    </div>
                    <div className="p-6 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">Total Coeficiente</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {registros
                          .reduce((sum, r) => sum + (r.coeficiente || 0), 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pestaña: Exportar */}
              <TabsContent value="exportar" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                    Exportar Datos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card CSV */}
                    <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <Download className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">Exportar CSV</h4>
                            <p className="text-sm text-gray-500">Exportación para sistema de controles</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleExportCSV}
                          variant="outline"
                          className="w-full"
                          disabled={registros.length === 0}
                        >
                          Descargar CSV
                        </Button>
                      </div>
                    </div>

                    {/* Card XLSX */}
                    <div className={`p-6 rounded-lg border transition-colors ${
                      asamblea.estado === "CERRADA" 
                        ? "bg-white border-gray-200 hover:border-green-300" 
                        : "bg-gray-50 border-gray-200 opacity-60"
                    }`}>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${
                            asamblea.estado === "CERRADA" 
                              ? "bg-green-50" 
                              : "bg-gray-100"
                          }`}>
                            <FileSpreadsheet className={`w-6 h-6 ${
                              asamblea.estado === "CERRADA" 
                                ? "text-green-600" 
                                : "text-gray-400"
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">Exportar XLSX</h4>
                            <p className="text-sm text-gray-500">Reporte final</p>
                            {asamblea.estado !== "CERRADA" && (
                              <p className="text-xs text-amber-600 mt-1">
                                Solo disponible cuando la asamblea esté finalizada
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={handleExportXLSX}
                          variant="outline"
                          className="w-full"
                          disabled={registros.length === 0 || asamblea.estado !== "CERRADA"}
                        >
                          Descargar XLSX
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pestaña: Reportar Control */}
              <TabsContent value="reportar" className="space-y-4 mt-6">
                {renderReportarControlTab()}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudo cargar la información de la asamblea
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
