"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Bell } from "lucide-react";
import type { Notification } from "@/types/notification";
import { useAsamblea } from "@/context/AsambleaContext";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

const notifications: Notification[] = [
  { id: 1, message: "Se creó una nueva asamblea", time: "2 min ago" },
  { id: 2, message: "Usuario agregado al sistema", time: "10 min ago" },
  { id: 3, message: "Quorum actualizado", time: "30 min ago" },
  { id: 4, message: "Se eliminó un operario", time: "1 hr ago" },
];

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

interface EstadisticasQuorum {
  total_registros: number;
  registros_presentes: number;
  total_coeficiente: number;
  coeficiente_presente: number;
}

export default function StatsPanel() {
  const { asambleaSeleccionada } = useAsamblea();
  const [chartData, setChartData] = useState<{ hora: string; personas: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estadisticasQuorum, setEstadisticasQuorum] = useState<EstadisticasQuorum | null>(null);
  const [isLoadingQuorum, setIsLoadingQuorum] = useState(true);

  // Función para obtener estadísticas de ingreso
  const obtenerEstadisticas = useCallback(async () => {
    const asambleaId = asambleaSeleccionada?.id;
    if (!asambleaId) {
      // Si no hay asamblea seleccionada, inicializar con datos vacíos
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
      const endpoint = `/registros/asamblea/${asambleaId}/estadisticas/ingreso-por-hora`;
      console.log("Llamando a endpoint:", endpoint);
      
      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        let errorMessage = "Error al obtener estadísticas";
        let errorData = null;
        try {
          const text = await response.text();
          if (text) {
            errorData = JSON.parse(text);
            errorMessage = errorData.detail || errorData.message || errorMessage;
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("Error en respuesta:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          errorData,
          endpoint,
        });
        throw new Error(errorMessage);
      }

      const estadisticas: Record<string, number> = await response.json();
      console.log("Estadísticas recibidas:", estadisticas);

      // Generar todas las horas del día
      const horas = generarHorasDelDia();

      // Crear datos del chart con todas las horas
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
      // En caso de error, inicializar con datos vacíos
      const horas = generarHorasDelDia();
      setChartData(
        horas.map((hora) => ({
          hora: convertirHoraA12H(hora),
          personas: 0,
        }))
      );
      setIsLoading(false);
    }
  }, [asambleaSeleccionada?.id]);

  // Función para obtener estadísticas de quorum y coeficiente
  const obtenerEstadisticasQuorum = useCallback(async () => {
    const asambleaId = asambleaSeleccionada?.id;
    if (!asambleaId) {
      setEstadisticasQuorum(null);
      setIsLoadingQuorum(false);
      return;
    }

    try {
      const endpoint = `/registros/asamblea/${asambleaId}/estadisticas/quorum-coeficiente`;
      console.log("Llamando a endpoint quorum:", endpoint);
      
      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!response.ok) {
        let errorMessage = "Error al obtener estadísticas de quorum";
        try {
          const text = await response.text();
          if (text) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.detail || errorData.message || errorMessage;
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("Error en respuesta quorum:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const estadisticas: EstadisticasQuorum = await response.json();
      console.log("Estadísticas quorum recibidas:", estadisticas);
      setEstadisticasQuorum(estadisticas);
      setIsLoadingQuorum(false);
    } catch (error) {
      console.error("Error al obtener estadísticas de quorum:", error);
      setEstadisticasQuorum(null);
      setIsLoadingQuorum(false);
    }
  }, [asambleaSeleccionada?.id]);

  // Efecto para cargar datos iniciales y configurar intervalo
  useEffect(() => {
    // Cargar datos inmediatamente
    obtenerEstadisticas();
    obtenerEstadisticasQuorum();

    // Configurar intervalo para actualizar cada 30 segundos (solo si está en la página)
    const intervalId = setInterval(() => {
      obtenerEstadisticas();
      obtenerEstadisticasQuorum();
    }, 30000); // 30 segundos

    // Limpiar intervalo al desmontar el componente
    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asambleaSeleccionada?.id]); // Re-ejecutar cuando cambie la asamblea seleccionada
  return (
    <div className="w-full h-full flex flex-col md:flex-row flex-1 gap-3 md:gap-6 overflow-y-auto md:overflow-hidden">
      {/* Columna izquierda: stats y chart */}
      <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Cards de estadísticas */}
        <div className="w-full flex flex-col sm:flex-row gap-3 md:gap-4">
          {/* Card 1 – Quorum Presente */}
          <Card className="w-full sm:flex-1 bg-white rounded-xl">
            <CardContent className="flex items-center justify-between gap-2 md:gap-4 p-4 md:p-6">
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <p className="text-xs md:text-sm text-gray-500">Quorum Presente</p>
                {isLoadingQuorum || !estadisticasQuorum ? (
                  <>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">-</h2>
                    <p className="text-xs md:text-sm text-gray-400">Cargando...</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      {estadisticasQuorum.total_registros > 0
                        ? Math.round(
                            (estadisticasQuorum.registros_presentes /
                              estadisticasQuorum.total_registros) *
                              100
                          )
                        : 0}
                      %
                    </h2>
                    <p className="text-xs md:text-sm text-gray-400">
                      {estadisticasQuorum.registros_presentes} de{" "}
                      {estadisticasQuorum.total_registros}
                    </p>
                  </>
                )}
              </div>
              <div className="w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
                {isLoadingQuorum || !estadisticasQuorum ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-gray-400">...</p>
                  </div>
                ) : (
                  <CircularProgressbar
                    value={
                      estadisticasQuorum.total_registros > 0
                        ? Math.round(
                            (estadisticasQuorum.registros_presentes /
                              estadisticasQuorum.total_registros) *
                              100
                          )
                        : 0
                    }
                    text={`${
                      estadisticasQuorum.total_registros > 0
                        ? Math.round(
                            (estadisticasQuorum.registros_presentes /
                              estadisticasQuorum.total_registros) *
                              100
                          )
                        : 0
                    }%`}
                    styles={buildStyles({
                      textSize: "16px",
                      pathColor: "#3b82f6",
                      textColor: "#3b82f6",
                      trailColor: "#e5e7eb",
                      strokeLinecap: "round",
                    })}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2 – Coeficiente Presente */}
          <Card className="w-full sm:flex-1 bg-white rounded-xl">
            <CardContent className="flex items-center justify-between gap-2 md:gap-4 p-4 md:p-6">
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <p className="text-xs md:text-sm text-gray-500">Coeficiente Presente</p>
                {isLoadingQuorum || !estadisticasQuorum ? (
                  <>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">-</h2>
                    <p className="text-xs md:text-sm text-gray-400">Cargando...</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      {estadisticasQuorum.total_coeficiente > 0
                        ? Math.round(
                            (estadisticasQuorum.coeficiente_presente /
                              estadisticasQuorum.total_coeficiente) *
                              100
                          )
                        : 0}
                      %
                    </h2>
                    <p className="text-xs md:text-sm text-gray-400">
                      {estadisticasQuorum.coeficiente_presente.toFixed(2)} de{" "}
                      {estadisticasQuorum.total_coeficiente.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
              <div className="w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
                {isLoadingQuorum || !estadisticasQuorum ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-gray-400">...</p>
                  </div>
                ) : (
                  <CircularProgressbar
                    value={
                      estadisticasQuorum.total_coeficiente > 0
                        ? Math.round(
                            (estadisticasQuorum.coeficiente_presente /
                              estadisticasQuorum.total_coeficiente) *
                              100
                          )
                        : 0
                    }
                    text={`${
                      estadisticasQuorum.total_coeficiente > 0
                        ? Math.round(
                            (estadisticasQuorum.coeficiente_presente /
                              estadisticasQuorum.total_coeficiente) *
                              100
                          )
                        : 0
                    }%`}
                    styles={buildStyles({
                      textSize: "16px",
                      pathColor: "#8b5cf6",
                      textColor: "#8b5cf6",
                      trailColor: "#e5e7eb",
                      strokeLinecap: "round",
                    })}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container del Chart */}
        <Container className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 md:gap-2 mb-2 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-card-foreground">Tendencia de ingreso</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Monitoreo de asistencia en tiempo real</p>
          </div>

          {/* Contenedor del chart que ocupa todo el alto restante */}
          <div className="flex-1 min-h-0 w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Cargando estadísticas...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="hora" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="personas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Container>
      </div>

      {/* Columna derecha: Notificaciones - OCULTO TEMPORALMENTE */}
      {/* <Card className="w-80 bg-white rounded-xl flex flex-col">
        <CardHeader className="flex items-center gap-2 border-b pb-2">
          <Bell className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-lg font-semibold">Notificaciones</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-y-auto">
          <ul className="space-y-3 p-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex flex-col p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <p className="text-sm text-gray-800">{n.message}</p>
                <span className="text-xs text-gray-400">{n.time}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card> */}

    </div>
  );
}
