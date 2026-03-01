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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileSpreadsheet, FileText, Loader2, Search, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { getAsamblea, updateAsambleaEstado, sendReportesControl, sendAvisoActualizarDatos, type Asamblea } from "@/lib/services/asambleaService";
import { getRegistros, type Registro } from "@/lib/services/registroService";
import * as XLSX from "xlsx-js-style";
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
  const [isSendingReporte, setIsSendingReporte] = useState(false);
  // Estados para Avisar actualizar datos
  const [searchAviso, setSearchAviso] = useState("");
  const [selectedAviso, setSelectedAviso] = useState<Set<string>>(new Set());
  const [isSendingAviso, setIsSendingAviso] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  // Obtener la explicación del estado actual
  const getEstadoExplicacion = (estado: string): string => {
    const explicaciones: { [key: string]: string } = {
      CREADA: "La asamblea ha sido creada pero aún no está activa. Los operarios no pueden registrar ingresos hasta que se active.",
      ACTIVA: "La asamblea está en curso y los operarios pueden registrar ingresos, salidas y gestionar poderes de los asistentes.",
      CERRADA: "La asamblea ha finalizado. Ya no se pueden registrar nuevas actividades y está disponible para exportar reportes finales.",
    };
    return explicaciones[estado] || "Estado desconocido";
  };

  // Obtener la explicación del siguiente estado
  const getSiguienteEstadoExplicacion = (siguienteEstado: string | null): string => {
    const explicaciones: { [key: string]: string } = {
      ACTIVA: "Al activar la asamblea, los operarios podrán comenzar a registrar ingresos y gestionar la asistencia de los participantes.",
      CERRADA: "Al finalizar la asamblea, se detendrán todos los registros de actividades y se habilitará la exportación de reportes finales.",
    };
    return siguienteEstado ? (explicaciones[siguienteEstado] || "Cambiar al siguiente estado") : "";
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

  // Exportar a XLS para sistema de controles
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

    try {
      // Crear datos para el Excel
      const datos = registrosExportar.map((item) => ({
        "ID NO": item.idNo,
        "Name": item.name,
        "Group NO": item.groupNo,
        "Weight": item.weight,
      }));

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Crear worksheet
      const ws = XLSX.utils.json_to_sheet(datos);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 10 }, // ID NO
        { wch: 30 }, // Name
        { wch: 12 }, // Group NO
        { wch: 12 }, // Weight
      ];
      ws["!cols"] = colWidths;

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Controles");

      // Descargar archivo
      XLSX.writeFile(wb, `${asamblea?.title || "asamblea"}_controles.xls`);

      toast.success("Archivo XLS exportado exitosamente");
    } catch (error) {
      console.error("Error al exportar XLS:", error);
      toast.error("Error al exportar el archivo XLS");
    }
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

  // Obtener actividades ordenadas de actividad_ingreso (actividad_1, actividad_2, ...)
  const getActividadesOrdenadas = (actividadIngreso: Record<string, any> | null): Array<{ tipo: string; hora: string }> => {
    if (!actividadIngreso || typeof actividadIngreso !== "object") return [];
    const keys = Object.keys(actividadIngreso)
      .filter((k) => k.startsWith("actividad_"))
      .sort((a, b) => {
        const numA = parseInt(a.replace("actividad_", ""), 10);
        const numB = parseInt(b.replace("actividad_", ""), 10);
        return numA - numB;
      });
    return keys
      .map((key) => {
        const a = actividadIngreso[key];
        if (!a || typeof a !== "object" || !a.tipo || !a.hora) return null;
        return { tipo: String(a.tipo).toLowerCase(), hora: String(a.hora) };
      })
      .filter((a): a is { tipo: string; hora: string } => a !== null);
  };

  // Primera hora de ingreso o reingreso
  const getHoraIngreso = (actividadIngreso: Record<string, any> | null): string => {
    const actividades = getActividadesOrdenadas(actividadIngreso);
    const primera = actividades.find((a) => a.tipo === "ingreso" || a.tipo === "reingreso");
    return primera?.hora ?? "";
  };

  // Última hora de salida
  const getHoraSalida = (actividadIngreso: Record<string, any> | null): string => {
    const actividades = getActividadesOrdenadas(actividadIngreso);
    let ultima = "";
    for (let i = actividades.length - 1; i >= 0; i--) {
      if (actividades[i].tipo === "salida") {
        ultima = actividades[i].hora;
        break;
      }
    }
    return ultima;
  };

  // Asistencia: Si si tiene al menos un ingreso o reingreso, No si no
  const getAsistenciaAsamblea = (actividadIngreso: Record<string, any> | null): "Si" | "No" => {
    const actividades = getActividadesOrdenadas(actividadIngreso);
    const tieneIngreso = actividades.some((a) => a.tipo === "ingreso" || a.tipo === "reingreso");
    return tieneIngreso ? "Si" : "No";
  };

  // ¿Poderes?: Si si tiene al menos poder_2, poder_3, etc. (no cuenta poder_1)
  const tienePoderesAdicionales = (gestionPoderes: Record<string, any> | null): boolean => {
    if (!gestionPoderes || typeof gestionPoderes !== "object") return false;
    const keys = Object.keys(gestionPoderes).filter((k) => k.startsWith("poder_") && k !== "poder_1");
    return keys.some((key) => {
      const p = gestionPoderes[key];
      return p && typeof p === "object" && (p.torre || p.apartamento || p.numero_control);
    });
  };

  // Estilo azul oscuro para encabezados de columna (xlsx-js-style)
  const headerCellStyle = {
    fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" },
    font: { color: { rgb: "FFFFFF" }, bold: true },
  };

  // Exportar a XLSX - Informe Final
  const handleExportXLSX = async () => {
    if (registros.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }
    if (!asamblea) return;

    try {
      // Obtener quorum como en el panel de operarios
      let quorumPresente = "N/A";
      let quorumFinal = "N/A";
      let inmueblesRegistrados = 0;
      let inmueblesNoRegistrados = registros.length;
      try {
        const res = await apiFetch(`/registros/asamblea/${asamblea.id}/estadisticas/quorum-coeficiente`, { method: "GET" });
        if (res.ok) {
          const q = await res.json();
          const totalReg = q.total_registros || 0;
          const presentes = q.registros_presentes ?? 0;
          const totalCoeff = q.total_coeficiente ?? 0;
          const coeffPresente = q.coeficiente_presente ?? 0;
          inmueblesRegistrados = presentes;
          inmueblesNoRegistrados = Math.max(0, totalReg - presentes);
          quorumPresente = totalReg > 0 ? `${((presentes / totalReg) * 100).toFixed(1)}%` : "N/A";
          quorumFinal = totalCoeff > 0 ? `${((coeffPresente / totalCoeff) * 100).toFixed(1)}%` : "N/A";
        }
      } catch {
        // Calcular presentes desde registros si falla la API
        const presentes = registros.filter((r) => getAsistenciaAsamblea(r.actividad_ingreso) === "Si").length;
        inmueblesRegistrados = presentes;
        inmueblesNoRegistrados = registros.length - presentes;
        quorumPresente = registros.length > 0 ? `${((presentes / registros.length) * 100).toFixed(1)}%` : "N/A";
        quorumFinal = "N/A";
      }

      const fechaAsamblea = asamblea.fecha_inicio ? formatDate(asamblea.fecha_inicio).split(",")[0] ?? formatDate(asamblea.fecha_inicio) : "N/A";
      const nombreAsamblea = asamblea.title || "N/A";
      const inicioAsamblea = formatDate(asamblea.fecha_inicio);
      const finAsamblea = formatDate(asamblea.fecha_final);

      const colHeaders = [
        "Asistencia asamblea",
        "N° Torre / Bloque",
        "N° Apartamento / Casa",
        "Nombre",
        "Nombre de quien lo representa o asistió a la asamblea",
        "¿Poderes?",
        "Coeficiente",
        "Cédula",
        "N° Control",
        "Nota",
        "Hora de ingreso",
        "Hora de salida",
        "Total de tiempo presente",
      ];

      const datos = registros.map((registro) => {
        const tiempoPresente = calcularTiempoPresente(registro.actividad_ingreso);
        const asistencia = getAsistenciaAsamblea(registro.actividad_ingreso);
        const poderes = tienePoderesAdicionales(registro.gestion_poderes) ? "Si" : "No";
        return [
          asistencia,
          registro.numero_torre || "",
          registro.numero_apartamento || "",
          registro.nombre,
          registro.nombre,
          poderes,
          registro.coeficiente ?? "",
          registro.cedula,
          registro.numero_control || "",
          "",
          getHoraIngreso(registro.actividad_ingreso),
          getHoraSalida(registro.actividad_ingreso),
          formatearTiempo(tiempoPresente),
        ];
      });

      // Fila 1: etiquetas de la cabecera informativa
      const row1Labels = [
        "Quorum presente",
        "Quorum final",
        "Inmuebles Registrados",
        "Inmuebles no Registrados",
        "Fecha de la Asamblea",
        "Nombre de la Asamblea",
        "Inicio de la asamblea",
        "Fin de la asamblea",
        ...Array(colHeaders.length - 8).fill(""),
      ];
      // Fila 2: valores de la cabecera informativa
      const row2Values = [
        quorumPresente,
        quorumFinal,
        inmueblesRegistrados,
        inmueblesNoRegistrados,
        fechaAsamblea,
        nombreAsamblea,
        inicioAsamblea,
        finAsamblea,
        ...Array(colHeaders.length - 8).fill(""),
      ];
      // Fila 3: encabezados de la tabla (azul oscuro)
      const aoa: (string | number)[][] = [row1Labels, row2Values, colHeaders, ...datos];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Aplicar estilo azul oscuro a la fila 3 (encabezados de columna)
      const headerRow = 3; // 1-based Excel row
      for (let c = 0; c < colHeaders.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c });
        const cell = ws[cellRef];
        if (cell) {
          (ws[cellRef] as any).s = headerCellStyle;
        }
      }

      const colWidths = [
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 30 },
        { wch: 45 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 16 },
        { wch: 22 },
      ];
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registros");

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
  const handleEnviarReporte = async () => {
    if (!asambleaId || selectedRegistros.size === 0) {
      toast.error("Debes seleccionar al menos un registro");
      return;
    }
    setIsSendingReporte(true);
    try {
      const result = await sendReportesControl(asambleaId, Array.from(selectedRegistros));
      if (result.enviados > 0) {
        toast.success(
          result.fallidos > 0
            ? `Se enviaron ${result.enviados} reporte(s). ${result.fallidos} fallido(s).`
            : `Se enviaron ${result.enviados} reporte(s) correctamente.`
        );
        if (result.errores?.length) {
          result.errores.slice(0, 3).forEach((msg) => toast.error(msg));
          if (result.errores.length > 3) {
            toast.error(`... y ${result.errores.length - 3} error(es) más`);
          }
        }
      } else if (result.fallidos > 0) {
        toast.error(`No se pudo enviar ningún reporte (${result.fallidos} fallido(s)).`);
        result.errores?.slice(0, 3).forEach((msg) => toast.error(msg));
      }
    } catch (error) {
      console.error("Error al enviar reportes:", error);
      toast.error(error instanceof Error ? error.message : "Error al enviar reportes de control");
    } finally {
      setIsSendingReporte(false);
    }
  };

  // Avisar actualizar: toggle y envío
  const handleToggleAviso = (id: string) => {
    setSelectedAviso((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnviarAviso = async () => {
    if (!asambleaId || selectedAviso.size === 0) {
      toast.error("Debes seleccionar al menos un registro");
      return;
    }
    setIsSendingAviso(true);
    try {
      const result = await sendAvisoActualizarDatos(asambleaId, Array.from(selectedAviso));
      if (result.enviados > 0) {
        toast.success(
          result.fallidos > 0
            ? `Se enviaron ${result.enviados} aviso(s). ${result.fallidos} fallido(s).`
            : `Se enviaron ${result.enviados} aviso(s) correctamente.`
        );
        if (result.errores?.length) {
          result.errores.slice(0, 3).forEach((msg) => toast.error(msg));
        }
      } else if (result.fallidos > 0) {
        toast.error(`No se pudo enviar ningún aviso (${result.fallidos} fallido(s)).`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar avisos");
    } finally {
      setIsSendingAviso(false);
    }
  };

  // Generar PDF con QR de ingreso desde el backend (link a página torre/apt)
  const handleGenerarPdfIngreso = async () => {
    if (!asamblea?.id) return;
    setIsGeneratingPdf(true);
    try {
      const response = await apiFetch(`/asambleas/${asamblea.id}/pdf-qr-ingreso`, { method: "GET" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ||
        `qr-ingreso-${(asamblea.title || asamblea.id).replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF descargado correctamente");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error al generar el PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
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

    // Solo los que tienen correo pueden ser seleccionados
    const registrosConCorreo = registrosFiltrados.filter(
      (r) => r.correo && String(r.correo).trim() !== ""
    );

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
            disabled={selectedRegistros.size === 0 || isSendingReporte}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSendingReporte ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSendingReporte ? "Enviando…" : `Enviar Reporte (${selectedRegistros.size})`}
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
                    checked={
                      registrosConCorreo.length > 0 &&
                      registrosConCorreo.every((r) => selectedRegistros.has(r.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRegistros(new Set(registrosConCorreo.map((r) => r.id)));
                      } else {
                        setSelectedRegistros(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>N° Control</TableHead>
                <TableHead>Coeficiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron registros con el control buscado
                  </TableCell>
                </TableRow>
              ) : (
                registrosFiltrados.map((registro) => {
                  const tieneCorreo = registro.correo && String(registro.correo).trim() !== "";
                  return (
                  <TableRow key={registro.id}>
                    <TableCell>
                      {tieneCorreo ? (
                        <Checkbox
                          checked={selectedRegistros.has(registro.id)}
                          onCheckedChange={() => handleToggleRegistro(registro.id)}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-not-allowed text-gray-400">
                              <XCircle className="h-5 w-5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>Este usuario no tiene correo electrónico registrado y no puede ser seleccionado.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{registro.nombre}</TableCell>
                    <TableCell>{registro.cedula}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={registro.correo ?? undefined}>
                      {registro.correo ?? "-"}
                    </TableCell>
                    <TableCell>{getNumeroControl(registro)}</TableCell>
                    <TableCell>{registro.coeficiente || "N/A"}</TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Renderizar pestaña Avisar actualizar datos (todos los registros, selección por correo)
  const renderAvisarActualizarTab = () => {
    const term = (searchAviso || "").trim().toLowerCase();
    const filtrados = term
      ? registros.filter(
          (r) =>
            (r.nombre || "").toLowerCase().includes(term) ||
            (r.cedula || "").toLowerCase().includes(term) ||
            (r.correo || "").toLowerCase().includes(term)
        )
      : registros;
    const conCorreo = filtrados.filter((r) => r.correo && String(r.correo).trim() !== "");

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Avisar para actualizar datos</h3>
          <Button
            onClick={handleEnviarAviso}
            disabled={selectedAviso.size === 0 || isSendingAviso}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSendingAviso ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSendingAviso ? "Enviando…" : `Enviar aviso (${selectedAviso.size})`}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Seleccione los registros a los que desea enviar un correo con enlace y QR para que
          actualicen sus datos (cédula, nombre, teléfono, correo). Solo se puede seleccionar a quienes
          tengan correo registrado.
        </p>
        <div className="w-full">
          <InputGroup>
            <InputGroupInput
              placeholder="Buscar por nombre, cédula o correo"
              value={searchAviso}
              onChange={(e) => setSearchAviso(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      conCorreo.length > 0 && conCorreo.every((r) => selectedAviso.has(r.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedAviso(new Set(conCorreo.map((r) => r.id)));
                      else setSelectedAviso(new Set());
                    }}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Correo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No hay registros o no coincide la búsqueda
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((registro) => {
                  const tieneCorreo =
                    registro.correo && String(registro.correo).trim() !== "";
                  return (
                    <TableRow key={registro.id}>
                      <TableCell>
                        {tieneCorreo ? (
                          <Checkbox
                            checked={selectedAviso.has(registro.id)}
                            onCheckedChange={() => handleToggleAviso(registro.id)}
                          />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-not-allowed text-gray-400">
                                <XCircle className="h-5 w-5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p>Sin correo registrado; no se puede enviar aviso.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{registro.nombre}</TableCell>
                      <TableCell>{registro.cedula}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={registro.correo ?? undefined}>
                        {registro.correo ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
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
              <TabsList className="flex flex-wrap gap-1 w-full h-auto">
                <TabsTrigger value="informacion">Información</TabsTrigger>
                <TabsTrigger value="estado">Estado</TabsTrigger>
                <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
                <TabsTrigger value="exportar">Exportar</TabsTrigger>
                <TabsTrigger value="aviso">Avisar actualizar</TabsTrigger>
                <TabsTrigger
                  value="pdfqr"
                  disabled={asamblea.estado === "CERRADA"}
                  className={asamblea.estado === "CERRADA" ? "opacity-50 cursor-not-allowed" : ""}
                >
                  PDF QR ingreso
                </TabsTrigger>
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
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                    Estado de la Asamblea
                  </h3>
                  
                  {/* Estado actual con explicación */}
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <FieldLabel className="text-sm font-medium text-gray-700">Estado Actual:</FieldLabel>
                        <span className={getEstadoClasses(asamblea.estado)}>
                          {getEstadoLabel(asamblea.estado)}
                        </span>
                      </div>
                      <div className="mt-3 p-4 bg-white rounded-md border border-gray-200">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {getEstadoExplicacion(asamblea.estado)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón para cambiar estado */}
                  {siguienteEstado ? (
                    <div className="flex items-center justify-center py-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm leading-relaxed">
                            {getSiguienteEstadoExplicacion(siguienteEstado)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-base font-medium mb-2">Esta asamblea no puede cambiar de estado</p>
                      <p className="text-sm">
                        La asamblea ha alcanzado su estado final y no se pueden realizar más cambios.
                      </p>
                    </div>
                  )}
                </div>
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
                    {/* Card XLS */}
                    <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <Download className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">Exportar XLS</h4>
                            <p className="text-sm text-gray-500">Exportación para sistema de controles</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleExportCSV}
                          variant="outline"
                          className="w-full"
                          disabled={registros.length === 0}
                        >
                          Descargar XLS
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

              {/* Pestaña: Avisar actualizar datos */}
              <TabsContent value="aviso" className="space-y-4 mt-6">
                {renderAvisarActualizarTab()}
              </TabsContent>
              {/* Pestaña: PDF con QR de ingreso (solo si asamblea no finalizada) */}
              <TabsContent value="pdfqr" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                    Generar PDF con QR de ingreso
                  </h3>
                  {asamblea.estado === "CERRADA" ? (
                    <p className="text-gray-500 py-4">
                      Esta opción solo está disponible cuando la asamblea no está finalizada. El QR
                      dirige a la página de ingreso con torre y apartamento.
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm">
                        Genera un PDF con un código QR único para esta asamblea. Al escanearlo, los
                        usuarios llegarán a la página de ingreso donde deberán ingresar su número
                        de torre y apartamento.
                      </p>
                      <Button
                        onClick={handleGenerarPdfIngreso}
                        disabled={isGeneratingPdf}
                        variant="outline"
                        className="gap-2"
                      >
                        {isGeneratingPdf ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        {isGeneratingPdf ? "Generando…" : "Descargar PDF con QR"}
                      </Button>
                    </>
                  )}
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
