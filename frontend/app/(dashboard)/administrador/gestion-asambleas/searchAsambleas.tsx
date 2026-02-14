"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Container } from "@/components/ui/container";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Search, Filter, MoreHorizontalIcon, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table"
import { AsambleaDetailsDialog } from "@/components/dialog/AsambleaDetailsDialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/my-ui/DataTable"
import { CreateAsambleaDialog } from "@/components/dialog/CreateAsambleaDialog"
import { getAsambleas, deleteAsamblea, type Asamblea } from "@/lib/services/asambleaService"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

export default function SearchAsambleas() {
  const [asambleas, setAsambleas] = useState<Asamblea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAsambleas, setTotalAsambleas] = useState(0);
  
  // Estado para itemsPerPage calculado por DataTable
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Estado para el dialog de detalles
  const [selectedAsambleaId, setSelectedAsambleaId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estado para el dialog de confirmación de eliminación
  const [asambleaToDelete, setAsambleaToDelete] = useState<Asamblea | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Ref para el timeout del debounce
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce para la búsqueda (500ms de delay)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Resetear a la primera página al buscar
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Cargar asambleas
  const loadAsambleas = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      };

      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }

      if (filterEstado !== "all") {
        params.estado = filterEstado;
      }

      if (fechaDesde) {
        params.fecha_desde = fechaDesde;
      }

      if (fechaHasta) {
        params.fecha_hasta = fechaHasta;
      }

      const response = await getAsambleas(params);
      setAsambleas(response.asambleas);
      setTotalAsambleas(response.total);
    } catch (error) {
      console.error("Error al cargar asambleas:", error);
      
      // Mensaje de error más específico
      let errorMessage = "Error al cargar las asambleas";
      if (error instanceof Error) {
        if (error.message.includes("No se pudo conectar") || error.message.includes("Failed to fetch")) {
          errorMessage = "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.";
        } else if (error.message.includes("ConnectionError")) {
          errorMessage = "Error de conexión. Verifica que el backend esté disponible.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      // Limpiar datos en caso de error
      setAsambleas([]);
      setTotalAsambleas(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterEstado, fechaDesde, fechaHasta]);

  // Cargar asambleas cuando cambian los filtros, la página o itemsPerPage
  useEffect(() => {
    loadAsambleas();
  }, [loadAsambleas]);

  // Función para manejar la búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Función para manejar el cambio de filtro de estado
  const handleFilterEstado = (value: string) => {
    setFilterEstado(value);
    setCurrentPage(1);
  };

  // Función para manejar el cambio de fecha desde
  const handleFechaDesde = (value: string) => {
    setFechaDesde(value);
    setCurrentPage(1);
  };

  // Función para manejar el cambio de fecha hasta
  const handleFechaHasta = (value: string) => {
    setFechaHasta(value);
    setCurrentPage(1);
  };

  // Función para limpiar filtros de fecha
  const clearFechaFilters = () => {
    setFechaDesde("");
    setFechaHasta("");
    setCurrentPage(1);
  };

  // Definir columnas de la tabla
  const columns: Column<Asamblea>[] = [
    { key: "nombre", label: "Nombre de la Asamblea" },
    { key: "fecha", label: "Fecha" },
    { key: "estado", label: "Estado" },
    { key: "acciones", label: "Acciones", className: "text-right" },
  ];

  // Función para renderizar skeleton personalizado
  const renderSkeletonRow = (index: number) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell>
        <Skeleton className="h-5 w-64" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 ml-auto" />
      </TableCell>
    </TableRow>
  );

  // Función para obtener las clases de estado
  const getEstadoClasses = (estado: string) => {
    if (estado === "ACTIVA") {
      return "bg-green-100 text-green-700 font-medium px-2 py-1 rounded-lg";
    } else if (estado === "CERRADA") {
      return "bg-gray-100 text-gray-700 font-medium px-2 py-1 rounded-lg";
    } else if (estado === "CREADA") {
      return "bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-lg";
    }
    return "bg-gray-100 text-gray-700 font-medium px-2 py-1 rounded-lg";
  };

  // Función para obtener el label del estado
  const getEstadoLabel = (estado: string) => {
    const estadoMap: { [key: string]: string } = {
      "ACTIVA": "Activa",
      "CERRADA": "Finalizada",
      "CREADA": "Creada"
    };
    return estadoMap[estado] || estado;
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  // Función para manejar la eliminación de asamblea
  const handleDeleteAsamblea = async () => {
    if (!asambleaToDelete) return;

    setIsDeleting(true);
    try {
      await deleteAsamblea(asambleaToDelete.id);
      toast.success("Asamblea eliminada exitosamente");
      setIsDeleteDialogOpen(false);
      setAsambleaToDelete(null);
      loadAsambleas();
    } catch (error) {
      console.error("Error al eliminar asamblea:", error);
      toast.error("Error al eliminar la asamblea");
    } finally {
      setIsDeleting(false);
    }
  };

  // Función para renderizar cada fila de asamblea
  const renderAsambleaRow = (asamblea: Asamblea, index: number) => (
    <TableRow 
      key={asamblea.id}
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
    >
      <TableCell>{asamblea.title}</TableCell>
      <TableCell>{formatDate(asamblea.created_at)}</TableCell>
      <TableCell>
        <span className={getEstadoClasses(asamblea.estado)}>
          {getEstadoLabel(asamblea.estado)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => {
              setSelectedAsambleaId(asamblea.id);
              setIsDialogOpen(true);
            }}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Ver detalles</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              setAsambleaToDelete(asamblea);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span className="sr-only">Eliminar asamblea</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="w-full flex flex-col gap-4 md:gap-6 animate-fade-in min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
      {/* Container de búsqueda */}
      <Container className="flex flex-col gap-3 md:gap-4 p-3 md:p-4 w-full animate-fade-in-down flex-shrink-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          {/* Input de búsqueda */}
          <div className="flex-1 w-full min-w-0">
            <InputGroup>
              <InputGroupInput 
                placeholder="Buscar asamblea por título o descripción" 
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="text-sm md:text-base"
              />
              <InputGroupAddon>
                <Search/>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Filtros - Horizontal en desktop */}
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 items-stretch sm:items-center flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Estado:</label>
              <Select value={filterEstado} onValueChange={handleFilterEstado}>
                <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] h-9 md:h-10">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Estado de Asamblea</SelectLabel>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="CREADA">Creada</SelectItem>
                    <SelectItem value="ACTIVA">Activa</SelectItem>
                    <SelectItem value="CERRADA">Cerrada</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro de rango de fechas */}
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">Rango:</label>
              <DateRangePicker
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
                onFechaDesdeChange={handleFechaDesde}
                onFechaHastaChange={handleFechaHasta}
                className="w-full sm:w-[240px] lg:w-[280px] h-9 md:h-10"
              />
            </div>
          </div>

          <CreateAsambleaDialog
            trigger={
              <Button className="h-9 md:h-10 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">+ Nueva Asamblea</span>
                <span className="sm:hidden">+ Nueva</span>
              </Button>
            }
            onAsambleaCreated={loadAsambleas}
          />
        </div>
      </Container>
      
      {/* Container de resultados con DataTable */}
      <DataTable
        columns={columns}
        data={asambleas}
        isLoading={isLoading}
        totalItems={totalAsambleas}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        renderRow={renderAsambleaRow}
        renderSkeletonRow={renderSkeletonRow}
        emptyMessage="No se encontraron asambleas"
        itemLabel="asambleas"
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Dialog de detalles de asamblea */}
      <AsambleaDetailsDialog
        asambleaId={selectedAsambleaId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAsambleaUpdated={loadAsambleas}
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar esta asamblea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la asamblea "{asambleaToDelete?.title}" y todos
              sus registros asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsamblea}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}