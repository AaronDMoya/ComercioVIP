"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAsamblea } from "@/context/AsambleaContext";
import { Container } from "@/components/ui/container";

// Force refresh - all Card components have been replaced with Container
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { getAsamblea, type Asamblea } from "@/lib/services/asambleaService";

interface EstadisticasQuorum {
  total_registros: number;
  registros_presentes: number;
  total_coeficiente: number;
  coeficiente_presente: number;
}

// Función para generar horas del día en formato HH:00
const generarHorasDelDia = (): string[] => {
  const horas: string[] = [];
  for (let i = 0; i < 24; i++) {
    horas.push(`${i.toString().padStart(2, "0")}:00`);
  }
  return horas;
};

// Función para convertir hora 24h a formato 12h con AM/PM
const convertirHoraA12H = (hora24: string): string => {
  const [hora, minutos] = hora24.split(":");
  const horaNum = parseInt(hora, 10);
  const periodo = horaNum >= 12 ? "PM" : "AM";
  const hora12 = horaNum === 0 ? 12 : horaNum > 12 ? horaNum - 12 : horaNum;
  return `${hora12}:${minutos}${periodo}`;
};

export default function VistaPantalla() {
  const searchParams = useSearchParams();
  const asambleaId = searchParams.get("asamblea");
  const { asambleaSeleccionada, asambleasActivas } = useAsamblea();
  
  const [chartData, setChartData] = useState<{ hora: string; personas: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estadisticasQuorum, setEstadisticasQuorum] = useState<EstadisticasQuorum | null>(null);
  const [isLoadingQuorum, setIsLoadingQuorum] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [asamblea, setAsamblea] = useState<Asamblea | null>(null);
  const [isLoadingAsamblea, setIsLoadingAsamblea] = useState(true);

  // Obtener la asamblea desde el ID del query o del contexto
  useEffect(() => {
    const cargarAsamblea = async () => {
      setIsLoadingAsamblea(true);
      
      if (asambleaId) {
        // Buscar primero en las asambleas activas del contexto
        const found = asambleasActivas.find(a => a.id === asambleaId);
        if (found) {
          setAsamblea(found);
          setIsLoadingAsamblea(false);
          return;
        }
        
        // Si no está en el contexto, cargar desde el backend
        try {
          const asambleaCargada = await getAsamblea(asambleaId);
          setAsamblea(asambleaCargada);
        } catch (error) {
          console.error("Error al cargar asamblea:", error);
          // Si falla, intentar con el contexto
          if (asambleaSeleccionada?.id === asambleaId) {
            setAsamblea(asambleaSeleccionada);
          }
        }
      } else if (asambleaSeleccionada) {
        setAsamblea(asambleaSeleccionada);
      }
      
      setIsLoadingAsamblea(false);
    };

    cargarAsamblea();
  }, [asambleaId, asambleasActivas, asambleaSeleccionada]);

  // Actualizar la hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para obtener estadísticas de ingreso
  const obtenerEstadisticas = async () => {
    const id = asamblea?.id;
    if (!id) {
      const horas = generarHorasDelDia();
      setChartData(
        horas.map((hora) => ({
          hora: convertirHoraA12H(hora),
          personas: 0,
        }))
      );
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = `/registros/asamblea/${id}/estadisticas/ingreso-por-hora`;
      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Error al obtener estadísticas");
      }

      const estadisticas: Record<string, number> = await response.json();
      const horas = generarHorasDelDia();

      const datos = horas.map((hora) => {
        const conteo = estadisticas[hora] || 0;
        return {
          hora: convertirHoraA12H(hora),
          personas: conteo,
        };
      });

      setChartData(datos);
      setIsLoading(false);
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      const horas = generarHorasDelDia();
      setChartData(
        horas.map((hora) => ({
          hora: convertirHoraA12H(hora),
          personas: 0,
        }))
      );
      setIsLoading(false);
    }
  };

  // Función para obtener estadísticas de quorum y coeficiente
  const obtenerEstadisticasQuorum = async () => {
    const id = asamblea?.id;
    if (!id) {
      setEstadisticasQuorum(null);
      setIsLoadingQuorum(false);
      return;
    }

    try {
      const endpoint = `/registros/asamblea/${id}/estadisticas/quorum-coeficiente`;
      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Error al obtener estadísticas de quorum");
      }

      const estadisticas: EstadisticasQuorum = await response.json();
      setEstadisticasQuorum(estadisticas);
      setIsLoadingQuorum(false);
    } catch (error) {
      console.error("Error al obtener estadísticas de quorum:", error);
      setEstadisticasQuorum(null);
      setIsLoadingQuorum(false);
    }
  };

  // Cargar datos y configurar intervalo
  useEffect(() => {
    if (!asamblea?.id) return;

    obtenerEstadisticas();
    obtenerEstadisticasQuorum();

    const intervalId = setInterval(() => {
      obtenerEstadisticas();
      obtenerEstadisticasQuorum();
    }, 30000); // Actualizar cada 30 segundos

    return () => {
      clearInterval(intervalId);
    };
  }, [asamblea?.id]);

  // Formatear fecha de la asamblea
  const formatearFechaAsamblea = (fecha: string | null) => {
    if (!fecha) return "N/A";
    try {
      const date = new Date(fecha);
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('es-ES', options);
    } catch {
      return fecha;
    }
  };

  // Verificar si está cargando o no hay asamblea antes de acceder a sus propiedades
  if (isLoadingAsamblea || !asamblea) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">Cargando información de la asamblea...</p>
        </div>
      </div>
    );
  }

  // Obtener fecha de la asamblea (fecha_inicio o fecha) - solo después de verificar que existe
  const fechaAsamblea = asamblea.fecha_inicio || (asamblea as any).fecha || null;

  const quorumPorcentaje = estadisticasQuorum && estadisticasQuorum.total_registros > 0
    ? Math.round((estadisticasQuorum.registros_presentes / estadisticasQuorum.total_registros) * 100)
    : 0;

  const coeficientePorcentaje = estadisticasQuorum && estadisticasQuorum.total_coeficiente > 0
    ? Math.round((estadisticasQuorum.coeficiente_presente / estadisticasQuorum.total_coeficiente) * 100)
    : 0;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 lg:p-6 xl:p-8 overflow-hidden">
      <div className="w-full h-full max-w-full mx-auto flex flex-col gap-3 lg:gap-4 xl:gap-6 min-h-0">
        {/* Header con título, fecha y hora */}
        <div className="bg-white rounded-2xl shadow-xl p-2 lg:p-3 xl:p-4 border border-gray-200 flex-shrink-0">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 lg:gap-3 xl:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-gray-900 break-words">
                {asamblea.title}
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 xl:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl px-3 lg:px-4 xl:px-5 py-2 lg:py-3 xl:py-4 shadow-md flex-shrink-0">
                <div className="text-xs text-blue-600 font-medium mb-0.5 uppercase tracking-wide">
                  Fecha Actual
                </div>
                <div className="text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-blue-900">
                  {currentTime.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl px-3 lg:px-4 xl:px-5 py-2 lg:py-3 xl:py-4 shadow-md flex-shrink-0">
                <div className="text-xs text-green-600 font-medium mb-0.5 uppercase tracking-wide">
                  Hora Actual
                </div>
                <div className="text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-green-900 font-mono">
                  {format(currentTime, "HH:mm:ss")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 xl:gap-6 flex-shrink-0">
          {/* Quorum Presente */}
          <Container className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow flex-shrink-0 py-0">
            <div className="p-4 lg:p-5 xl:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">Quorum Presente</p>
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">-</p>
                  ) : (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-blue-600">{quorumPorcentaje}%</p>
                  )}
                </div>
                <div className="w-14 h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 flex-shrink-0">
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs text-gray-400">...</p>
                    </div>
                  ) : (
                    <CircularProgressbar
                      value={quorumPorcentaje}
                      text={`${quorumPorcentaje}%`}
                      styles={buildStyles({
                        textSize: "20px",
                        pathColor: "#3b82f6",
                        textColor: "#3b82f6",
                        trailColor: "#e5e7eb",
                        strokeLinecap: "round",
                      })}
                    />
                  )}
                </div>
              </div>
              {estadisticasQuorum && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {estadisticasQuorum.registros_presentes} de {estadisticasQuorum.total_registros} registros
                  </span>
                </div>
              )}
            </div>
          </Container>

          {/* Coeficiente Presente */}
          <Container className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow flex-shrink-0 py-0">
            <div className="p-4 lg:p-5 xl:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">Coeficiente Presente</p>
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">-</p>
                  ) : (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-purple-600">{coeficientePorcentaje}%</p>
                  )}
                </div>
                <div className="w-14 h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 flex-shrink-0">
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs text-gray-400">...</p>
                    </div>
                  ) : (
                    <CircularProgressbar
                      value={coeficientePorcentaje}
                      text={`${coeficientePorcentaje}%`}
                      styles={buildStyles({
                        textSize: "20px",
                        pathColor: "#8b5cf6",
                        textColor: "#8b5cf6",
                        trailColor: "#e5e7eb",
                        strokeLinecap: "round",
                      })}
                    />
                  )}
                </div>
              </div>
              {estadisticasQuorum && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    {estadisticasQuorum.coeficiente_presente.toFixed(2)} de {estadisticasQuorum.total_coeficiente.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </Container>

          {/* Total Registros */}
          <Container className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow flex-shrink-0 py-0">
            <div className="p-4 lg:p-5 xl:p-6 flex items-center">
              <div className="flex items-center gap-2 lg:gap-3 w-full">
                <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-500">Total Registros</p>
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-gray-900">-</p>
                  ) : (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-green-600">
                      {estadisticasQuorum.total_registros}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Container>

          {/* Registros Presentes */}
          <Container className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow flex-shrink-0 py-0">
            <div className="p-4 lg:p-5 xl:p-6 flex items-center">
              <div className="flex items-center gap-2 lg:gap-3 w-full">
                <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-500">Presentes</p>
                  {isLoadingQuorum || !estadisticasQuorum ? (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-gray-900">-</p>
                  ) : (
                    <p className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-blue-600">
                      {estadisticasQuorum.registros_presentes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </div>

        {/* Gráfico de tendencia de ingreso */}
        <Container className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow flex-1 min-h-0 flex flex-col py-0">
          <div className="p-3 lg:p-4 xl:p-5 flex-1 min-h-0 flex flex-col">
            <div className="mb-2 lg:mb-3 flex-shrink-0">
              <h2 className="text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Tendencia de Ingreso</h2>
              <p className="text-xs lg:text-sm text-gray-600">Monitoreo de asistencia en tiempo real</p>
            </div>
            <div className="flex-1 min-h-0 w-full h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full w-full">
                  <p className="text-gray-500">Cargando estadísticas...</p>
                </div>
              ) : (
                <div className="w-full h-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        dataKey="hora" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "8px 12px"
                        }}
                      />
                      <Bar 
                        dataKey="personas" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]}
                        name="Personas"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
