"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/ui/container";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { FieldLabel } from "@/components/ui/field"
import { Search, FileSearch } from "lucide-react";
import { searchRegistros, getRegistro, type Registro } from "@/lib/services/registroService";
import { useAsamblea } from "@/context/AsambleaContext";
import { useRegistro } from "@/context/RegistroContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchPerson() {
  const { asambleaSeleccionada } = useAsamblea();
  const { seleccionarRegistro } = useRegistro();
  
  const [torre, setTorre] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [cedula, setCedula] = useState("");
  const [numeroControl, setNumeroControl] = useState("");
  const [resultados, setResultados] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Función de búsqueda con debounce
  const performSearch = useCallback(async () => {
    if (!asambleaSeleccionada) {
      setResultados([]);
      setHasSearched(false);
      return;
    }

    // Verificar que al menos un campo tenga valor
    if (!torre && !apartamento && !cedula && !numeroControl) {
      setResultados([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const data = await searchRegistros(asambleaSeleccionada.id, {
        numero_torre: torre || undefined,
        numero_apartamento: apartamento || undefined,
        cedula: cedula || undefined,
        numero_control: numeroControl || undefined,
      });
      
      setResultados(data);
    } catch (error) {
      console.error("Error al buscar:", error);
      setResultados([]);
    } finally {
      setIsLoading(false);
    }
  }, [asambleaSeleccionada, torre, apartamento, cedula, numeroControl]);

  // Efecto con debounce para búsqueda automática
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleSelectResult = async (registro: Registro) => {
    try {
      // Recargar el registro desde el backend para obtener los datos más recientes
      const registroActualizado = await getRegistro(registro.id);
      seleccionarRegistro(registroActualizado);
    } catch (error) {
      console.error("Error al cargar registro:", error);
      // Si falla, usar el registro de la lista como fallback
      seleccionarRegistro(registro);
    }
  };

  return (
    <Container className="px-3 md:px-6 h-full flex flex-col min-h-0 w-full lg:w-96 gap-0">
      {/* Sección de búsqueda */}
      <div className="flex-shrink-0 border-b pb-2">
        <div className="flex items-center gap-2 border-b pb-2 mb-3">
          <Search className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm md:text-base font-semibold">Búsqueda</h3>
        </div>

        <div className="flex flex-col gap-2 md:gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600">
            <div>
              <FieldLabel>Torre/Bloque:</FieldLabel>
              <InputGroup>
                <InputGroupInput 
                  placeholder="Ej: A" 
                  value={torre}
                  onChange={(e) => setTorre(e.target.value)}
                />
              </InputGroup>
            </div>
            <div>
              <FieldLabel>Apto/Casa:</FieldLabel>
              <InputGroup>
                <InputGroupInput 
                  placeholder="Ej: 101" 
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                />
              </InputGroup>
            </div>
            <div>
              <FieldLabel>N° Identidad:</FieldLabel>
              <InputGroup>
                <InputGroupInput 
                  placeholder="Ej: 10000000" 
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                />
              </InputGroup>
            </div>
            <div>
              <FieldLabel>N° Control:</FieldLabel>
              <InputGroup>
                <InputGroupInput 
                  placeholder="Ej: 100" 
                  value={numeroControl}
                  onChange={(e) => setNumeroControl(e.target.value)}
                />
              </InputGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de resultados */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between border-b p-2 mb-2 md:mb-4">
          <h3 className="text-sm md:text-lg font-semibold">Resultados</h3>
          <p className="font-semibold bg-gray-100 p-1 rounded-lg text-xs md:text-sm">
            {resultados.length} encontrados
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : resultados.length === 0 && hasSearched ? (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-2 h-full">
              <FileSearch className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-medium">Sin resultados</p>
            </div>
          ) : resultados.length > 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {resultados.map((registro) => (
                <button
                  key={registro.id}
                  onClick={() => handleSelectResult(registro)}
                  className="text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-gray-900">{registro.nombre}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                    {registro.numero_torre && <span>Torre: {registro.numero_torre}</span>}
                    {registro.numero_apartamento && <span>Apto: {registro.numero_apartamento}</span>}
                    {registro.cedula && <span>Cédula: {registro.cedula}</span>}
                    {registro.numero_control && <span>Control: {registro.numero_control}</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-2 h-full">
              <FileSearch className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-medium">Realice una búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}