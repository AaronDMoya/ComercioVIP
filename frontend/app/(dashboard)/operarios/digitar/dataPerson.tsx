"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { User, Timer, Gavel, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { useRegistro } from "@/context/RegistroContext";
import { useAsamblea } from "@/context/AsambleaContext";
import { toast } from "sonner";
import {
  buscarRegistrosParaPoderes, 
  verificarPoder, 
  transferirPoder,
  devolverPoder,
  obtenerCoeficientePoder,
  verificarControlExistente,
  actualizarRegistro,
  getRegistro,
  getRegistros,
  type Registro 
} from "@/lib/services/registroService";

interface Poder {
  torre?: string;
  apartamento?: string;
  numero_control?: string;
}

interface Actividad {
  tipo: string;
  hora: string;
}

interface Sugerencia {
  id: string;
  nombre: string;
  torre: string | null;
  apartamento: string | null;
  numero_control: string | null;
}

export default function DataPerson() {
  const { registroSeleccionado, actualizarRegistro: actualizarRegistroContext, seleccionarRegistro } = useRegistro();
  const { asambleaSeleccionada } = useAsamblea();
  const [nuevaTorre, setNuevaTorre] = useState("");
  const [nuevoApartamento, setNuevoApartamento] = useState("");
  const [nuevoControl, setNuevoControl] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerenciaSeleccionada, setSugerenciaSeleccionada] = useState<Sugerencia | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coeficienteTotal, setCoeficienteTotal] = useState<number | null>(null);
  const sugerenciasRef = useRef<HTMLDivElement>(null);
  
  // Estados para actividad de ingreso
  const [showControlDialog, setShowControlDialog] = useState(false);
  const [numeroControlInput, setNumeroControlInput] = useState("");
  const [showConfirmSalida, setShowConfirmSalida] = useState(false);
  
  // Estados para edición de número de control en la tabla
  const [editandoControlIndex, setEditandoControlIndex] = useState<number | null>(null);
  const [valorControlEditando, setValorControlEditando] = useState<string>("");

  // Obtener poderes como array
  const getPoderes = (): Poder[] => {
    if (!registroSeleccionado?.gestion_poderes) {
      // Si no hay poderes, retornar poder_1 vacío
      return [{
        torre: "",
        apartamento: "",
        numero_control: ""
      }];
    }
    
    if (Array.isArray(registroSeleccionado.gestion_poderes)) {
      return registroSeleccionado.gestion_poderes;
    }
    
    if (typeof registroSeleccionado.gestion_poderes === 'object') {
      const keys = Object.keys(registroSeleccionado.gestion_poderes);
      const poderKeys = keys.filter(key => key.startsWith('poder_'));
      
      if (poderKeys.length > 0) {
        poderKeys.sort((a, b) => {
          const numA = parseInt(a.replace('poder_', '')) || 0;
          const numB = parseInt(b.replace('poder_', '')) || 0;
          return numA - numB;
        });
        
        return poderKeys.map(key => {
          const poder = registroSeleccionado.gestion_poderes![key] as any;
          // Asegurar que el formato sea correcto
          return {
            torre: poder.torre || poder.numero_torre || "",
            apartamento: poder.apartamento || poder.numero_apartamento || "",
            numero_control: poder.numero_control || ""
          };
        });
      }
      
      // Compatibilidad con formato antiguo
      if (registroSeleccionado.gestion_poderes.torre || 
          registroSeleccionado.gestion_poderes.apartamento || 
          registroSeleccionado.gestion_poderes.numero_control) {
        return [{
          torre: registroSeleccionado.gestion_poderes.torre || registroSeleccionado.gestion_poderes.numero_torre || "",
          apartamento: registroSeleccionado.gestion_poderes.apartamento || registroSeleccionado.gestion_poderes.numero_apartamento || "",
          numero_control: registroSeleccionado.gestion_poderes.numero_control || ""
        }];
      }
      
      return Object.values(registroSeleccionado.gestion_poderes) as Poder[];
    }
    
    // Si no hay poderes válidos, retornar poder_1 vacío
    return [{
      torre: "",
      apartamento: "",
      numero_control: ""
    }];
  };

  const getActividades = (): Actividad[] => {
    if (!registroSeleccionado?.actividad_ingreso) return [];
    
    if (typeof registroSeleccionado.actividad_ingreso === 'object') {
      const keys = Object.keys(registroSeleccionado.actividad_ingreso);
      const actividadKeys = keys.filter(key => key.startsWith('actividad_'));
      
      if (actividadKeys.length > 0) {
        actividadKeys.sort((a, b) => {
          const numA = parseInt(a.replace('actividad_', '')) || 0;
          const numB = parseInt(b.replace('actividad_', '')) || 0;
          return numA - numB;
        });
        
        return actividadKeys.map(key => {
          const actividad = registroSeleccionado.actividad_ingreso![key] as any;
          return {
            tipo: actividad.tipo || "",
            hora: actividad.hora || ""
          };
        });
      }
    }
    
    return [];
  };

  // Determinar qué botón mostrar y qué acción realizar
  const getTipoSiguienteAccion = (): { tipo: "ingreso" | "salida" | "reingreso" | null; texto: string; requiereControl: boolean } => {
    const actividades = getActividades();
    
    if (actividades.length === 0) {
      return { tipo: "ingreso", texto: "Registrar Ingreso", requiereControl: true };
    }
    
    const ultimaActividad = actividades[actividades.length - 1];
    
    if (ultimaActividad.tipo === "ingreso" || ultimaActividad.tipo === "reingreso") {
      return { tipo: "salida", texto: "Registrar Salida", requiereControl: false };
    } else if (ultimaActividad.tipo === "salida") {
      // Después de una salida, el reingreso requiere control nuevamente
      return { tipo: "reingreso", texto: "Registrar Reingreso", requiereControl: true };
    }
    
    return { tipo: null, texto: "Registrar Ingreso", requiereControl: true };
  };

  // Obtener hora actual en formato 12 horas
  const obtenerHoraActual = (): string => {
    const ahora = new Date();
    const horas = ahora.getHours();
    const minutos = ahora.getMinutes();
    const ampm = horas >= 12 ? 'PM' : 'AM';
    const horas12 = horas % 12 || 12;
    const minutosStr = minutos.toString().padStart(2, '0');
    return `${horas12}:${minutosStr}${ampm}`;
  };

  // Función para registrar actividad
  const handleRegistrarActividad = async () => {
    if (!registroSeleccionado || !asambleaSeleccionada) return;

    // Verificar si el poder fue transferido
    if (poderFueTransferido()) {
      toast.error("No se puede registrar actividades para una persona cuyo poder fue transferido");
      return;
    }

    const siguienteAccion = getTipoSiguienteAccion();
    
    if (siguienteAccion.tipo === "ingreso" || (siguienteAccion.tipo === "reingreso" && siguienteAccion.requiereControl)) {
      // Si es el primer ingreso o reingreso después de salida, mostrar dialog para número de control
      setShowControlDialog(true);
    } else if (siguienteAccion.tipo === "salida") {
      // Mostrar confirmación para salida
      setShowConfirmSalida(true);
    } else if (siguienteAccion.tipo === "reingreso") {
      // Registrar reingreso directamente (cuando no requiere control)
      await registrarActividad("reingreso");
    }
  };

  // Registrar actividad después de confirmar número de control
  const handleConfirmarIngreso = async () => {
    if (!numeroControlInput.trim()) {
      toast.error("Debe ingresar un número de control");
      return;
    }

    if (!registroSeleccionado || !asambleaSeleccionada) {
      toast.error("Error: No hay registro seleccionado");
      return;
    }

    // Verificar si el número de control ya está asignado a otra persona
    try {
      const resultado = await verificarControlExistente(
        asambleaSeleccionada.id,
        numeroControlInput.trim(),
        registroSeleccionado.id
      );

      if (resultado.existe && resultado.registro) {
        toast.error(`El número de control ${numeroControlInput.trim()} ya está asignado a ${resultado.registro.nombre}`);
        return;
      }
    } catch (error) {
      console.error("Error al verificar control:", error);
      toast.error("Error al verificar el número de control");
      return;
    }

    setShowControlDialog(false);
    const siguienteAccion = getTipoSiguienteAccion();
    // Puede ser "ingreso" (primer ingreso) o "reingreso" (después de salida)
    await registrarActividad(siguienteAccion.tipo as "ingreso" | "reingreso", numeroControlInput.trim());
    setNumeroControlInput("");
  };

  // Registrar salida después de confirmar
  const handleConfirmarSalida = async () => {
    setShowConfirmSalida(false);
    await registrarActividad("salida");
  };

  // Función principal para registrar actividad
  const registrarActividad = async (tipo: "ingreso" | "salida" | "reingreso", numeroControl?: string) => {
    if (!registroSeleccionado || !asambleaSeleccionada) return;

    setIsLoading(true);

    try {
      const actividadesActuales = getActividades();
      const siguienteNumero = actividadesActuales.length + 1;
      const hora = obtenerHoraActual();

      // Crear nueva actividad
      const nuevaActividad: Actividad = {
        tipo: tipo,
        hora: hora
      };

      // Construir el objeto de actividades
      const actividadIngresoNuevo: Record<string, Actividad> = {};
      
      // Agregar actividades existentes
      actividadesActuales.forEach((act, index) => {
        actividadIngresoNuevo[`actividad_${index + 1}`] = act;
      });

      // Agregar nueva actividad
      actividadIngresoNuevo[`actividad_${siguienteNumero}`] = nuevaActividad;

      // Determinar qué hacer con el número de control y gestion_poderes
      let numeroControlActualizar: string | null | undefined = undefined;
      let gestionPoderesActualizar: Record<string, any> | undefined = undefined;
      
      if (tipo === "salida") {
        // Al salir, quitar el número de control
        numeroControlActualizar = null;
      } else if (tipo === "ingreso" || tipo === "reingreso") {
        // Al ingresar o reingresar, asignar el número de control
        numeroControlActualizar = numeroControl || undefined;
        
        // Actualizar el poder_1 con el número de control
        if (numeroControl) {
          const poderesActuales = getPoderes();
          const gestionPoderesActual = registroSeleccionado.gestion_poderes || {};
          
          // Obtener los datos del poder_1 actual o usar los datos de la persona
          let poder1 = {
            torre: registroSeleccionado.numero_torre || "",
            apartamento: registroSeleccionado.numero_apartamento || "",
            numero_control: numeroControl
          };
          
          // Si ya existe poder_1, mantener su torre y apartamento, solo actualizar numero_control
          if (poderesActuales.length > 0) {
            const poder1Actual = poderesActuales[0];
            poder1 = {
              torre: poder1Actual.torre || registroSeleccionado.numero_torre || "",
              apartamento: poder1Actual.apartamento || registroSeleccionado.numero_apartamento || "",
              numero_control: numeroControl
            };
          }
          
          // Construir el nuevo gestion_poderes
          gestionPoderesActualizar = {
            poder_1: poder1
          };
          
          // Agregar los demás poderes si existen
          if (poderesActuales.length > 1) {
            poderesActuales.slice(1).forEach((poder, index) => {
              gestionPoderesActualizar![`poder_${index + 2}`] = {
                torre: poder.torre || "",
                apartamento: poder.apartamento || "",
                numero_control: poder.numero_control || ""
              };
            });
          }
        }
      }

      // Actualizar registro
      const registroActualizado = await actualizarRegistro(
        registroSeleccionado.id,
        gestionPoderesActualizar, // gestion_poderes (actualizado con numero_control en poder_1)
        actividadIngresoNuevo,
        numeroControlActualizar
      );

      actualizarRegistroContext(registroActualizado);
      
      const tipoTexto = tipo === "ingreso" ? "Ingreso" : tipo === "salida" ? "Salida" : "Reingreso";
      toast.success(`${tipoTexto} registrado exitosamente a las ${hora}`);
    } catch (error) {
      console.error("Error al registrar actividad:", error);
      toast.error("Error al registrar la actividad");
    } finally {
      setIsLoading(false);
    }
  };

  const poderes = getPoderes();
  const actividades = getActividades();
  const [registroConPoderTransferido, setRegistroConPoderTransferido] = useState<Registro | null>(null);

  // Verificar si el poder fue transferido (poder_1 está vacío)
  const poderFueTransferido = (): boolean => {
    if (!registroSeleccionado?.gestion_poderes) return false;
    
    const poderesArray = getPoderes();
    if (poderesArray.length > 0) {
      const poder1 = poderesArray[0];
      return !poder1.torre && !poder1.apartamento && !poder1.numero_control;
    }
    
    return false;
  };

  // Verificar si el registro puede agregar poderes
  // Solo puede agregar poderes si:
  // 1. El poder_1 no está vacío (no se le ha transferido su poder principal)
  // 2. La última actividad es "ingreso" o "reingreso" (está presente)
  const puedeAgregarPoderes = (): boolean => {
    // Si el poder fue transferido, no puede agregar poderes
    if (poderFueTransferido()) return false;
    
    // Verificar la última actividad
    const actividades = getActividades();
    
    // Si no hay actividades, no puede agregar poderes (no está presente)
    if (actividades.length === 0) return false;
    
    // Verificar que la última actividad sea "ingreso" o "reingreso"
    const ultimaActividad = actividades[actividades.length - 1];
    return ultimaActividad.tipo === "ingreso" || ultimaActividad.tipo === "reingreso";
  };

  // Verificar si puede registrar actividades
  const puedeRegistrarActividades = (): boolean => {
    // Si el poder fue transferido, no puede registrar actividades
    return !poderFueTransferido();
  };

  // Buscar el registro que tiene el poder transferido de esta persona
  useEffect(() => {
    const buscarRegistroConPoderTransferido = async () => {
      if (!registroSeleccionado || !asambleaSeleccionada) {
        setRegistroConPoderTransferido(null);
        return;
      }

      const poderesArray = getPoderes();
      if (poderesArray.length === 0) {
        setRegistroConPoderTransferido(null);
        return;
      }

      const poder1 = poderesArray[0];
      const estaVacio = !poder1.torre && !poder1.apartamento && !poder1.numero_control;

      // Si el poder_1 está vacío, buscar quién tiene el poder de esta persona
      // El poder transferido es el poder original de esta persona (su torre, apartamento, numero_control)
      if (estaVacio && registroSeleccionado.numero_torre && registroSeleccionado.numero_apartamento) {
        try {
          // Obtener todos los registros de la asamblea y buscar manualmente
          // porque el poder puede tener diferentes formatos de número de control
          const todosLosRegistros = await getRegistros(asambleaSeleccionada.id);
          
          // Buscar el registro que tiene el poder de esta persona
          let registroEncontrado = null;
          
          for (const registro of todosLosRegistros) {
            if (registro.id === registroSeleccionado.id) continue; // Saltar el registro actual
            
            if (!registro.gestion_poderes) continue;
            
            // Buscar en los poderes del registro
            const poderesRegistro = registro.gestion_poderes;
            if (typeof poderesRegistro === 'object') {
              const poderesArray = Object.values(poderesRegistro);
              
              for (const poder of poderesArray) {
                if (typeof poder === 'object' && poder !== null) {
                  const poderTorre = (poder.torre || poder.numero_torre || "").trim().toLowerCase();
                  const poderApto = (poder.apartamento || poder.numero_apartamento || "").trim().toLowerCase();
                  
                  const personaTorre = (registroSeleccionado.numero_torre || "").trim().toLowerCase();
                  const personaApto = (registroSeleccionado.numero_apartamento || "").trim().toLowerCase();
                  
                  // Comparar solo torre y apartamento (el número de control puede variar)
                  if (poderTorre === personaTorre && poderApto === personaApto) {
                    registroEncontrado = registro;
                    break;
                  }
                }
              }
              
              if (registroEncontrado) break;
            }
          }

          // Si se encontró, guardarlo
          if (registroEncontrado) {
            setRegistroConPoderTransferido(registroEncontrado);
          } else {
            setRegistroConPoderTransferido(null);
          }
        } catch (error) {
          // Si no se encuentra, significa que el poder no existe o ya fue eliminado
          console.error("Error al buscar registro con poder transferido:", error);
          setRegistroConPoderTransferido(null);
        }
      } else {
        setRegistroConPoderTransferido(null);
      }
    };

    buscarRegistroConPoderTransferido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registroSeleccionado?.id, asambleaSeleccionada?.id, registroSeleccionado?.gestion_poderes]);

  // Calcular el coeficiente total (coeficiente propio + coeficientes de los poderes asignados)
  useEffect(() => {
    const calcularCoeficienteTotal = async () => {
      if (!registroSeleccionado || !asambleaSeleccionada) {
        setCoeficienteTotal(null);
        return;
      }

      console.log(`Recalculando coeficiente total para registro: ${registroSeleccionado.id} - ${registroSeleccionado.nombre}`);

      // Empezar con el coeficiente de la persona actual (asegurar que sea número)
      const coeficienteBase = typeof registroSeleccionado.coeficiente === 'number' 
        ? registroSeleccionado.coeficiente 
        : 0;
      let total = coeficienteBase;

      // Obtener todos los poderes (excepto el poder_1 vacío)
      const poderes = getPoderes().filter((poder, index) => {
        // Si es el poder_1 y está vacío, no contarlo
        if (index === 0 && !poder.torre && !poder.apartamento && !poder.numero_control) {
          return false;
        }
        // Solo contar poderes que tengan al menos torre o apartamento
        return poder.torre || poder.apartamento;
      });

      // Obtener los datos de la persona actual para comparar
      const torreActual = (registroSeleccionado.numero_torre || "").trim().toLowerCase();
      const apartamentoActual = (registroSeleccionado.numero_apartamento || "").trim().toLowerCase();

      // Para cada poder, obtener el coeficiente del dueño original
      console.log(`Calculando coeficiente total. Poderes encontrados: ${poderes.length}`);
      
      for (const poder of poderes) {
        const torrePoder = (poder.torre || "").trim();
        const apartamentoPoder = (poder.apartamento || "").trim();
        
        if (torrePoder || apartamentoPoder) {
          // Verificar si el poder pertenece a la misma persona (no sumar su propio coeficiente)
          const torrePoderLower = torrePoder.toLowerCase();
          const apartamentoPoderLower = apartamentoPoder.toLowerCase();
          
          const esPoderPropio = torrePoderLower === torreActual && apartamentoPoderLower === apartamentoActual;
          
          if (esPoderPropio) {
            console.log(`⚠ Poder pertenece a la misma persona (${torrePoder}-${apartamentoPoder}), omitiendo para evitar duplicado`);
            continue;
          }
          
          console.log(`Buscando coeficiente para poder: Torre="${torrePoder}", Apto="${apartamentoPoder}"`);
          
          try {
            // Buscar el coeficiente del dueño original (solo necesita torre y apartamento)
            const coeficiente = await obtenerCoeficientePoder(
              asambleaSeleccionada.id,
              torrePoder,
              apartamentoPoder,
              "" // numero_control no es necesario para la búsqueda
            );
            
            console.log(`Resultado de obtenerCoeficientePoder:`, coeficiente, typeof coeficiente);
            
            if (coeficiente !== null && typeof coeficiente === 'number' && !isNaN(coeficiente)) {
              total += Number(coeficiente);
              console.log(`✓ Coeficiente encontrado y sumado: ${coeficiente} (Total ahora: ${total})`);
            } else {
              console.warn(`✗ No se encontró coeficiente válido para poder ${torrePoder}-${apartamentoPoder}. Valor recibido:`, coeficiente);
            }
          } catch (error) {
            console.error(`Error al obtener coeficiente del poder ${torrePoder}-${apartamentoPoder}:`, error);
          }
        } else {
          console.warn(`Poder sin torre ni apartamento, omitiendo:`, poder);
        }
      }
      
      console.log(`Coeficiente base: ${coeficienteBase}, Coeficiente total calculado: ${total}`);

      // Asegurar que total sea un número válido
      setCoeficienteTotal(typeof total === 'number' && !isNaN(total) ? total : null);
    };

    calcularCoeficienteTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registroSeleccionado?.id, asambleaSeleccionada?.id, JSON.stringify(registroSeleccionado?.gestion_poderes)]);

  // Verificar si un poder ya existe en el registro actual (solo por torre y apartamento)
  const poderYaExiste = (torre: string, apartamento: string): boolean => {
    const poderesActuales = getPoderes();
    return poderesActuales.some(poder => {
      const poderTorre = (poder.torre || "").trim().toLowerCase();
      const poderApto = (poder.apartamento || "").trim().toLowerCase();
      
      const nuevaTorre = torre.trim().toLowerCase();
      const nuevoApto = apartamento.trim().toLowerCase();
      
      return poderTorre === nuevaTorre && poderApto === nuevoApto;
    });
  };

  // Buscar sugerencias para autocompletado
  const buscarSugerencias = useCallback(async () => {
    if (!asambleaSeleccionada) return;

    const tieneValores = nuevaTorre || nuevoApartamento;
    if (!tieneValores) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    try {
      const registros = await buscarRegistrosParaPoderes(asambleaSeleccionada.id, {
        torre: nuevaTorre || undefined,
        apartamento: nuevoApartamento || undefined,
        // No buscar por número de control, solo por torre y apartamento
      }, 50); // Aumentar el límite para tener más opciones

      // Filtrar solo los registros que NO tienen número de control (NO están presentes - ausentes)
      const registrosSinControl = registros.filter(r => !r.numero_control || r.numero_control.trim() === "");

      // Calcular score de relevancia para cada registro
      const sugerenciasConScore = registrosSinControl.map(r => {
        let score = 0;
        const torreRegistro = (r.numero_torre || "").trim().toLowerCase();
        const apartamentoRegistro = (r.numero_apartamento || "").trim().toLowerCase();
        const torreBusqueda = (nuevaTorre || "").trim().toLowerCase();
        const apartamentoBusqueda = (nuevoApartamento || "").trim().toLowerCase();

        // Score por coincidencia de torre
        if (torreBusqueda && torreRegistro) {
          if (torreRegistro === torreBusqueda) {
            score += 100; // Coincidencia exacta
          } else if (torreRegistro.startsWith(torreBusqueda)) {
            score += 50; // Empieza con la búsqueda
          } else if (torreRegistro.includes(torreBusqueda)) {
            score += 25; // Contiene la búsqueda
          }
        }

        // Score por coincidencia de apartamento (aunque no afecta la búsqueda, puede ayudar a ordenar)
        if (apartamentoBusqueda && apartamentoRegistro) {
          if (apartamentoRegistro === apartamentoBusqueda) {
            score += 10; // Coincidencia exacta de apartamento (peso menor)
          } else if (apartamentoRegistro.startsWith(apartamentoBusqueda)) {
            score += 5; // Empieza con la búsqueda
          } else if (apartamentoRegistro.includes(apartamentoBusqueda)) {
            score += 2; // Contiene la búsqueda
          }
        }

        return {
          id: r.id,
          nombre: r.nombre,
          torre: r.numero_torre,
          apartamento: r.numero_apartamento,
          numero_control: r.numero_control,
          score: score,
        };
      });

      // Ordenar por score (mayor primero) y luego por nombre
      const sugerenciasData: Sugerencia[] = sugerenciasConScore
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score; // Mayor score primero
          }
          // Si tienen el mismo score, ordenar por nombre
          return (a.nombre || "").localeCompare(b.nombre || "");
        })
        .map(({ score, ...rest }) => rest); // Remover el score del resultado final

      setSugerencias(sugerenciasData);
      // Mostrar automáticamente si hay sugerencias
      setMostrarSugerencias(sugerenciasData.length > 0);
    } catch (error) {
      console.error("Error al buscar sugerencias:", error);
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  }, [asambleaSeleccionada, nuevaTorre, nuevoApartamento]);

  // Debounce para búsqueda de sugerencias
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarSugerencias();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [buscarSugerencias]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Limpiar inputs cuando cambia el registro seleccionado
  useEffect(() => {
    setNuevaTorre("");
    setNuevoApartamento("");
    setNuevoControl("");
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSugerenciaSeleccionada(null);
  }, [registroSeleccionado]);

  // Verificar si los datos escritos coinciden con alguna sugerencia
  useEffect(() => {
    if (!nuevaTorre || !nuevoApartamento) {
      // Si falta torre o apartamento, quitar la selección
      setSugerenciaSeleccionada(null);
      return;
    }

    // Buscar si los datos coinciden con alguna sugerencia (solo torre y apartamento, sin control)
    const sugerenciaCoincidente = sugerencias.find(sug => {
      const torreMatch = (sug.torre || "").trim().toLowerCase() === nuevaTorre.trim().toLowerCase();
      const aptoMatch = (sug.apartamento || "").trim().toLowerCase() === nuevoApartamento.trim().toLowerCase();
      // Verificar que NO tenga número de control (NO está presente - ausente)
      const sinControl = !sug.numero_control || sug.numero_control.trim() === "";
      return torreMatch && aptoMatch && sinControl;
    });

    if (sugerenciaCoincidente) {
      setSugerenciaSeleccionada(sugerenciaCoincidente);
      setMostrarSugerencias(false);
    } else {
      // Si no coincide, quitar la selección y mostrar sugerencias si hay
      setSugerenciaSeleccionada(null);
      if (sugerencias.length > 0 && (nuevaTorre || nuevoApartamento)) {
        setMostrarSugerencias(true);
      }
    }
  }, [nuevaTorre, nuevoApartamento, sugerencias]);

  // Seleccionar una sugerencia
  const seleccionarSugerencia = (sugerencia: Sugerencia) => {
    setNuevaTorre(sugerencia.torre || "");
    setNuevoApartamento(sugerencia.apartamento || "");
    setNuevoControl(""); // No se usa número de control para poderes presentes
    setSugerenciaSeleccionada(sugerencia);
    setMostrarSugerencias(false);
  };

  // Función para agregar un nuevo poder
  const handleAgregarPoder = async () => {
    if (!registroSeleccionado || !asambleaSeleccionada) return;

    // Validar que hay una sugerencia seleccionada
    if (!sugerenciaSeleccionada) {
      toast.error("Debe seleccionar un poder de la lista o escribir datos que coincidan con un registro");
      return;
    }

    // Validar que los campos requeridos tengan valor
    if (!nuevaTorre || !nuevoApartamento) {
      toast.error("Debe completar los campos Torre y Apto");
      return;
    }

    // Validar que el poder seleccionado NO tenga número de control (NO está presente - ausente)
    if (sugerenciaSeleccionada.numero_control && sugerenciaSeleccionada.numero_control.trim() !== "") {
      toast.error("Solo se pueden asignar poderes de personas que NO están presentes (sin número de control)");
      return;
    }

    setIsLoading(true);

    try {
      // Verificar que el poder no esté duplicado en este registro
      if (poderYaExiste(nuevaTorre, nuevoApartamento)) {
        toast.error("Este poder ya está agregado a esta persona");
        setIsLoading(false);
        return;
      }

      // Verificar que el poder existe (sin número de control porque está ausente)
      const registroConPoder = await verificarPoder(
        asambleaSeleccionada.id,
        nuevaTorre,
        nuevoApartamento,
        "" // Sin número de control porque está ausente
      );

      if (!registroConPoder) {
        toast.error("No se encontró un registro con el poder especificado");
        setIsLoading(false);
        return;
      }

      // Si el poder ya pertenece a este registro, no hacer nada
      if (registroConPoder.id === registroSeleccionado.id) {
        toast.error("Este poder ya pertenece a esta persona");
        setIsLoading(false);
        return;
      }

      // Guardar el ID del registro origen para actualizarlo después
      const registroOrigenId = registroConPoder.id;

      // Obtener el número de control del poder_1 por defecto
      const poderesActuales = getPoderes();
      const numeroControlPorDefecto = poderesActuales.length > 0 && poderesActuales[0].numero_control 
        ? poderesActuales[0].numero_control 
        : "";

      // Transferir el poder (sin número de control porque el poder original no lo tiene)
      const resultado = await transferirPoder(asambleaSeleccionada.id, {
        registro_destino_id: registroSeleccionado.id,
        torre: nuevaTorre,
        apartamento: nuevoApartamento,
        numero_control: "", // Sin número de control porque está ausente
      });

      // Recargar el registro destino actualizado desde el backend
      let registroActualizado = await getRegistro(registroSeleccionado.id);
      
      // Si hay un número de control por defecto, actualizar el poder recién transferido
      if (numeroControlPorDefecto) {
        const poderesDespuesTransferencia = registroActualizado.gestion_poderes || {};
        const poderesArray = Object.keys(poderesDespuesTransferencia)
          .filter(key => key.startsWith('poder_'))
          .sort((a, b) => {
            const numA = parseInt(a.replace('poder_', '')) || 0;
            const numB = parseInt(b.replace('poder_', '')) || 0;
            return numA - numB;
          });
        
        // Encontrar el poder recién transferido (el último poder que coincida con torre y apartamento)
        let poderRecienTransferidoKey: string | null = null;
        for (let i = poderesArray.length - 1; i >= 0; i--) {
          const key = poderesArray[i];
          const poder = poderesDespuesTransferencia[key] as any;
          const poderTorre = (poder.torre || poder.numero_torre || "").trim().toLowerCase();
          const poderApto = (poder.apartamento || poder.numero_apartamento || "").trim().toLowerCase();
          
          if (poderTorre === nuevaTorre.trim().toLowerCase() && 
              poderApto === nuevoApartamento.trim().toLowerCase()) {
            poderRecienTransferidoKey = key;
            break;
          }
        }
        
        // Si encontramos el poder recién transferido, actualizar su número de control
        if (poderRecienTransferidoKey) {
          const gestionPoderesActualizado = { ...poderesDespuesTransferencia };
          gestionPoderesActualizado[poderRecienTransferidoKey] = {
            ...gestionPoderesActualizado[poderRecienTransferidoKey],
            numero_control: numeroControlPorDefecto
          };
          
          // Actualizar el registro con el número de control
          registroActualizado = await actualizarRegistro(
            registroSeleccionado.id,
            gestionPoderesActualizado
          );
        }
      }
      
      actualizarRegistroContext(registroActualizado);

      // Actualizar el registro origen si está seleccionado
      // Recargar el registro origen desde el backend para asegurar que esté actualizado
      try {
        const registroOrigenActualizado = await getRegistro(registroOrigenId);
        // Si el registro origen es el mismo que está seleccionado, actualizarlo
        // Esto puede pasar si el usuario cambió de registro después de iniciar la transferencia
        if (registroOrigenId === registroSeleccionado.id) {
          // Esto no debería pasar normalmente, pero por si acaso
          actualizarRegistroContext(registroOrigenActualizado);
        }
      } catch (error) {
        console.error("Error al actualizar registro origen:", error);
        // No es crítico si falla, el usuario puede recargar manualmente
      }
      
      // Nota: Si el usuario está viendo el registro origen en otra instancia/ventana,
      // necesitará recargar manualmente. Para una solución más completa, se podría
      // implementar un sistema de eventos o WebSockets.

      // Limpiar los inputs
      setNuevaTorre("");
      setNuevoApartamento("");
      setNuevoControl("");
      setSugerencias([]);
      setMostrarSugerencias(false);
      setSugerenciaSeleccionada(null);
      
      toast.success("Poder transferido exitosamente");
    } catch (error: any) {
      console.error("Error al agregar poder:", error);
      const mensaje = error?.message || "Error al transferir el poder";
      toast.error(mensaje);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar el número de control editado
  const handleGuardarControl = async (index: number) => {
    if (!registroSeleccionado || !asambleaSeleccionada) return;

    const nuevoControl = valorControlEditando.trim();
    
    // Si el control no cambió, solo salir del modo edición
    const poderesActuales = getPoderes();
    const controlActual = poderesActuales[index].numero_control || "";
    if (nuevoControl === controlActual) {
      setEditandoControlIndex(null);
      setValorControlEditando("");
      return;
    }

    // Si hay un nuevo control, validar que no exista en otro poder
    if (nuevoControl) {
      try {
        const resultado = await verificarControlExistente(
          asambleaSeleccionada.id,
          nuevoControl,
          registroSeleccionado.id
        );

        if (resultado.existe && resultado.registro) {
          toast.error(`El número de control ${nuevoControl} ya está asignado a un poder de ${resultado.registro.nombre}`);
          return;
        }
      } catch (error) {
        console.error("Error al verificar control:", error);
        toast.error("Error al verificar el número de control");
        return;
      }
    }

    setIsLoading(true);

    try {
      const poderActualizado = {
        ...poderesActuales[index],
        numero_control: nuevoControl
      };

      // Actualizar el poder en el array
      const poderesActualizados = [...poderesActuales];
      poderesActualizados[index] = poderActualizado;

      // Construir el nuevo gestion_poderes
      const gestionPoderesNuevo: Record<string, Poder> = {};
      poderesActualizados.forEach((poder, i) => {
        gestionPoderesNuevo[`poder_${i + 1}`] = poder;
      });

      // Actualizar en el backend
      const registroActualizado = await actualizarRegistro(
        registroSeleccionado.id,
        gestionPoderesNuevo
      );

      actualizarRegistroContext(registroActualizado);
      
      // Salir del modo edición
      setEditandoControlIndex(null);
      setValorControlEditando("");
      
      toast.success("Número de control actualizado");
    } catch (error) {
      console.error("Error al actualizar número de control:", error);
      toast.error("Error al actualizar el número de control");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar un poder (solo si no es el primero)
  const handleEliminarPoder = async (index: number) => {
    if (!registroSeleccionado || !asambleaSeleccionada) return;

    // No permitir eliminar el primer poder
    if (index === 0) {
      toast.error("No se puede eliminar el primer poder");
      return;
    }

    setIsLoading(true);

    try {
      const poderesActuales = getPoderes();
      const poderAEliminar = poderesActuales[index];
      
      if (!poderAEliminar) {
        toast.error("No se encontró el poder a eliminar");
        setIsLoading(false);
        return;
      }

      // Obtener los datos del poder que se va a eliminar
      const torre = poderAEliminar.torre || "";
      const apartamento = poderAEliminar.apartamento || "";
      const numero_control = poderAEliminar.numero_control || "";

      // Devolver el poder a su dueño original
      try {
        const resultado = await devolverPoder(asambleaSeleccionada.id, {
          registro_actual_id: registroSeleccionado.id,
          torre: torre,
          apartamento: apartamento,
          numero_control: numero_control,
        });

        // Actualizar el registro actual en el contexto
        actualizarRegistroContext(resultado.registro_actual);

        // Si el dueño original es el registro seleccionado actualmente, actualizarlo también
        if (resultado.dueno_original.id === registroSeleccionado.id) {
          actualizarRegistroContext(resultado.dueno_original);
        }

        toast.success("Poder devuelto a su dueño original");
      } catch (error: any) {
        // Si no se encuentra el dueño original, simplemente eliminar el poder
        console.warn("No se encontró el dueño original, eliminando el poder:", error);
        
        const poderesActualizados = poderesActuales.filter((_, i) => i !== index);

        // Siempre debe haber al menos poder_1, aunque esté vacío
        const gestionPoderesNuevo: Record<string, Poder> = {};
        
        if (poderesActualizados.length === 0) {
          // Si no quedan poderes, dejar poder_1 vacío
          gestionPoderesNuevo["poder_1"] = {
            torre: "",
            apartamento: "",
            numero_control: ""
          };
        } else {
          // Reorganizar los poderes manteniendo la secuencia poder_1, poder_2, etc.
          poderesActualizados.forEach((poder, i) => {
            gestionPoderesNuevo[`poder_${i + 1}`] = poder;
          });
        }

        // Actualizar en el backend
        const registroActualizado = await actualizarRegistro(
          registroSeleccionado.id,
          gestionPoderesNuevo
        );

        actualizarRegistroContext(registroActualizado);
        toast.success("Poder eliminado");
      }
    } catch (error) {
      console.error("Error al eliminar poder:", error);
      toast.error("Error al eliminar el poder");
    } finally {
      setIsLoading(false);
    }
  };

  if (!registroSeleccionado) {
    return (
      <Container className="px-6 h-full flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-medium">Seleccione una persona de los resultados</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="px-6 h-full flex flex-col min-h-0">
      {/* Información básica */}
      <div className="flex-shrink-0 flex gap-4 border-b pb-4">
                <User className="w-12 h-12 text-gray-500 bg-gray-200 p-2 rounded-full flex-shrink-0" />

                <div className="flex-1 flex justify-between">
                    <div className="flex flex-col justify-between">
            <h1 className="text-lg font-semibold text-gray-900">{registroSeleccionado.nombre}</h1>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
              {registroSeleccionado.numero_torre && (
                <p>Torre/Bloque: {registroSeleccionado.numero_torre}</p>
              )}
              {registroSeleccionado.numero_apartamento && (
                <p>Apto/Casa: {registroSeleccionado.numero_apartamento}</p>
              )}
              {registroSeleccionado.cedula && (
                <p>N° Identidad: {registroSeleccionado.cedula}</p>
              )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex flex-col items-center">
                        <p className="text-sm text-gray-500">N° Control</p>
              <span className="font-semibold text-blue-600 text-xl">
                {registroSeleccionado.numero_control || "--"}
              </span>
                        </div>

                        <div className="h-6 border-l border-gray-300" />

                        <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500">Coeficiente Total</p>
              <span className="font-semibold text-green-600 text-xl">
                {coeficienteTotal !== null && typeof coeficienteTotal === 'number' 
                  ? coeficienteTotal.toFixed(2) 
                  : (typeof registroSeleccionado.coeficiente === 'number' 
                    ? registroSeleccionado.coeficiente.toFixed(2) 
                    : "--")}
              </span>
            </div>
                        </div>
                    </div>
                </div>

      {/* Sección inferior: Gestión de Poderes y Actividad de Ingresos */}
      <div className="flex-1 min-h-0 flex gap-6 mt-6 overflow-hidden">
        {/* Gestión de Poderes - Izquierda */}
        <div className="w-full md:w-1/2 flex flex-col min-h-0">
          <div className="flex-shrink-0 flex items-center gap-2 border-b pb-2 mb-4">
                <Gavel className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Gestión de Poderes</h3>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <Table className="w-full">
                    <TableHeader>
                    <TableRow>
                        <TableHead>Torre/Bloque</TableHead>
                        <TableHead>Apto/Casa</TableHead>
                    <TableHead>N° Control</TableHead>
                    <TableHead className="w-12"></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                  {poderes.length > 0 ? (
                    poderes.map((poder, index) => {
                      // Verificar si el poder está vacío
                      const estaVacio = !poder.torre && !poder.apartamento && !poder.numero_control;
                      
                      // Si es el poder_1 y está vacío, no mostrar la fila
                      if (index === 0 && estaVacio) {
                        return null;
                      }
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{poder.torre || "--"}</TableCell>
                          <TableCell>{poder.apartamento || "--"}</TableCell>
                          <TableCell>
                            {editandoControlIndex === index ? (
                              <Input
                                value={valorControlEditando}
                                onChange={(e) => setValorControlEditando(e.target.value)}
                                onBlur={() => handleGuardarControl(index)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleGuardarControl(index);
                                  } else if (e.key === 'Escape') {
                                    setEditandoControlIndex(null);
                                    setValorControlEditando("");
                                  }
                                }}
                                className="h-8 text-sm"
                                autoFocus
                                disabled={isLoading}
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditandoControlIndex(index);
                                  setValorControlEditando(poder.numero_control || "");
                                }}
                                className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center"
                                title="Click para editar"
                              >
                                {poder.numero_control || "--"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {index === 0 ? (
                              <span className="text-xs text-gray-400">Fijo</span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleEliminarPoder(index)}
                                title="Eliminar poder"
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                    </TableRow>
                      );
                    }).filter(Boolean)
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-400 text-sm">
                        No hay poderes registrados
                      </TableCell>
                    </TableRow>
                  )}
                    </TableBody>
                </Table>
                </div>

            {/* Inputs y botón al fondo - Solo mostrar si puede agregar poderes */}
            {puedeAgregarPoderes() ? (
              <div className="flex-shrink-0 mt-4 flex flex-col gap-2 relative" ref={sugerenciasRef}>
                {/* Select de sugerencias en la parte superior - Solo mostrar si no hay selección */}
                {!sugerenciaSeleccionada && mostrarSugerencias && sugerencias.length > 0 && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Seleccione un poder de la lista:
                    </label>
                    <div className="border border-gray-200 rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
                      {sugerencias.map((sugerencia) => (
                        <button
                          key={sugerencia.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
                          onClick={() => seleccionarSugerencia(sugerencia)}
                        >
                          <div className="font-semibold text-sm text-gray-900">{sugerencia.nombre}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {sugerencia.torre && <span>Torre: {sugerencia.torre}</span>}
                            {sugerencia.torre && sugerencia.apartamento && <span className="mx-1">•</span>}
                            {sugerencia.apartamento && <span>Apto: {sugerencia.apartamento}</span>}
                          {(!sugerencia.numero_control || sugerencia.numero_control.trim() === "") && (
                            <span className="ml-2 text-blue-700 font-semibold">(Ausente)</span>
                          )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mostrar información del poder seleccionado */}
                {sugerenciaSeleccionada && (
                  <div className="mb-2 p-3 bg-green-50 border-2 border-green-500 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-900">Poder seleccionado:</p>
                        <p className="text-sm text-green-700 mt-1">{sugerenciaSeleccionada.nombre}</p>
                        <p className="text-xs text-green-600 mt-1">
                        Torre: {sugerenciaSeleccionada.torre || "--"} • 
                        Apto: {sugerenciaSeleccionada.apartamento || "--"}
                        {(!sugerenciaSeleccionada.numero_control || sugerenciaSeleccionada.numero_control.trim() === "") && (
                          <span className="ml-2 text-green-700 font-semibold">(Ausente)</span>
                        )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Torre/Bloque" 
                      value={nuevaTorre}
                      onChange={(e) => {
                        setNuevaTorre(e.target.value);
                        // Si se modifica, quitar la selección
                        if (sugerenciaSeleccionada) {
                          setSugerenciaSeleccionada(null);
                          setMostrarSugerencias(sugerencias.length > 0);
                        }
                      }}
                      onFocus={() => {
                        if (!sugerenciaSeleccionada) {
                          setMostrarSugerencias(sugerencias.length > 0);
                        }
                      }}
                      disabled={isLoading}
                      className={sugerenciaSeleccionada ? 'border-green-500' : ''}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Apto/Casa" 
                      value={nuevoApartamento}
                      onChange={(e) => {
                        setNuevoApartamento(e.target.value);
                        // Si se modifica, quitar la selección
                        if (sugerenciaSeleccionada) {
                          setSugerenciaSeleccionada(null);
                          setMostrarSugerencias(sugerencias.length > 0);
                        }
                      }}
                      onFocus={() => {
                        if (!sugerenciaSeleccionada) {
                          setMostrarSugerencias(sugerencias.length > 0);
                        }
                      }}
                      disabled={isLoading}
                      className={sugerenciaSeleccionada ? 'border-green-500' : ''}
                    />
                  </div>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                    onClick={handleAgregarPoder}
                    disabled={isLoading || !sugerenciaSeleccionada}
                  >
                    {isLoading ? "..." : "Agregar"}
                </Button>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Timer className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Persona no presente
                    </p>
                    <p className="text-sm text-amber-700">
                      {(() => {
                        const actividades = getActividades();
                        if (actividades.length === 0) {
                          return "Esta persona aún no ha registrado su ingreso. Por favor, registre el ingreso para poder asignarle poderes.";
                        } else {
                          const ultimaActividad = actividades[actividades.length - 1];
                          if (ultimaActividad.tipo === "salida") {
                            return "Esta persona ha registrado su salida y no se encuentra presente. Registre un reingreso para poder asignarle poderes nuevamente.";
                          } else {
                            // Si el poder_1 está vacío (transferido)
                            const poderesArray = getPoderes();
                            if (poderesArray.length > 0) {
                              const poder1 = poderesArray[0];
                              const estaVacio = !poder1.torre && !poder1.apartamento && !poder1.numero_control;
                              if (estaVacio) {
                                return registroConPoderTransferido ? (
                                  <>El poder de esta persona fue transferido al número de documento identificado con <span className="font-semibold">{registroConPoderTransferido.cedula}</span>.</>
                                ) : (
                                  "El poder de esta persona fue transferido."
                                );
                              }
                            }
                            return "No se puede agregar poderes en este momento.";
                          }
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator orientation="vertical" className="h-full" />

        {/* Actividad de Ingresos - Derecha */}
        <div className="w-full md:w-1/2 flex flex-col min-h-0">
          <div className="flex-shrink-0 flex items-center gap-2 border-b pb-2 mb-4">
                <Timer className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Actividad de Ingresos</h3>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
              {actividades.length > 0 ? (
                <Table className="w-full">
                    <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Hora</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {actividades.map((actividad, index) => (
                      <TableRow key={index}>
                        <TableCell className="capitalize">{actividad.tipo || "--"}</TableCell>
                        <TableCell>{actividad.hora || "--"}</TableCell>
                    </TableRow>
                    ))}
                    </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No hay actividades registradas
                </div>
              )}
                </div>

            <div className="flex-shrink-0">
              {(() => {
                const puedeRegistrar = puedeRegistrarActividades();
                const siguienteAccion = getTipoSiguienteAccion();
                
                if (!puedeRegistrar) {
                  return (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Timer className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900 mb-1">
                            No se puede registrar actividades
                          </p>
                          <p className="text-sm text-red-700">
                            {registroConPoderTransferido ? (
                              <>El poder de esta persona fue transferido al número de documento identificado con <span className="font-semibold">{registroConPoderTransferido.cedula}</span>. No se pueden registrar actividades para esta persona.</>
                            ) : (
                              "El poder de esta persona fue transferido. No se pueden registrar actividades."
                            )}
                          </p>
                        </div>
        </div>
    </div>
  );
}
                
                return (
                  <Button 
                    className={`w-full p-4 mt-4 ${
                      siguienteAccion.tipo === "salida" 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    onClick={handleRegistrarActividad}
                    disabled={isLoading}
                  >
                    {isLoading ? "..." : siguienteAccion.texto}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para ingresar número de control (primer ingreso) */}
      <Dialog open={showControlDialog} onOpenChange={setShowControlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Control</DialogTitle>
            <DialogDescription>
              Ingrese el número de control para registrar el ingreso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Número de control"
              value={numeroControlInput}
              onChange={(e) => setNumeroControlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmarIngreso();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowControlDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarIngreso} disabled={!numeroControlInput.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para salida */}
      <AlertDialog open={showConfirmSalida} onOpenChange={setShowConfirmSalida}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Salida</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea registrar la salida a las {obtenerHoraActual()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmSalida(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarSalida}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
