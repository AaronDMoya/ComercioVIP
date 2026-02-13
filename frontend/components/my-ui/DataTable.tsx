"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

// Función para calcular itemsPerPage basándose solo en el tamaño de la ventana
function calculateItemsPerPageFromWindow(): number {
  if (typeof window === "undefined") return 10;
  
  // Valores estimados fijos (en píxeles)
  const ROW_HEIGHT = 57; // Altura de cada fila de la tabla
  const SEARCH_CONTAINER_HEIGHT = 100; // Altura estimada del contenedor de búsqueda
  const TABLE_HEADER_HEIGHT = 41; // Altura del header de la tabla
  const TABLE_FOOTER_HEIGHT = 73; // Altura del footer con paginación
  const CONTAINER_PADDING = 32; // Padding del contenedor (p-4 = 16px arriba y abajo)
  const GAP_BETWEEN_SECTIONS = 24; // gap-6 entre contenedores
  const SIDEBAR_INSET_PADDING = 16; // Padding del SidebarInset si existe
  
  // Calcular altura disponible
  const windowHeight = window.innerHeight;
  const availableHeight = windowHeight 
    - SEARCH_CONTAINER_HEIGHT 
    - CONTAINER_PADDING 
    - GAP_BETWEEN_SECTIONS 
    - TABLE_HEADER_HEIGHT 
    - TABLE_FOOTER_HEIGHT
    - SIDEBAR_INSET_PADDING;
  
  // Calcular cuántas filas caben
  const rowsThatFit = Math.floor(availableHeight / ROW_HEIGHT);
  
  // Asegurarnos de que al menos mostremos 5 elementos y máximo 50
  return Math.max(5, Math.min(rowsThatFit, 50));
}

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  totalItems: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderSkeletonRow?: (index: number) => React.ReactNode;
  emptyMessage?: string;
  itemLabel?: string; // Para el texto "Mostrando X de Y usuarios/asambleas"
  onItemsPerPageChange?: (itemsPerPage: number) => void; // Callback cuando cambia itemsPerPage
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading,
  totalItems,
  currentPage,
  onPageChange,
  renderRow,
  renderSkeletonRow,
  emptyMessage = "No se encontraron resultados",
  itemLabel = "elementos",
  onItemsPerPageChange,
}: DataTableProps<T>) {
  // Estado para controlar si el componente está montado (después de hidratación)
  const [isMounted, setIsMounted] = useState(false);
  
  // Estado para forzar recálculo cuando cambie el tamaño de la ventana
  const [windowHeight, setWindowHeight] = useState(0);

  // Marcar como montado después de la hidratación
  useEffect(() => {
    setIsMounted(true);
    setWindowHeight(window.innerHeight);
  }, []);

  // Manejar resize para forzar recálculo de itemsPerPage
  useEffect(() => {
    if (!isMounted) return;
    
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMounted]);

  // Calcular itemsPerPage de forma síncrona, se recalcula cuando cambia windowHeight
  // Usar valor por defecto hasta que el componente esté montado para evitar errores de hidratación
  const itemsPerPage = useMemo(() => {
    if (!isMounted) {
      return 10; // Valor por defecto para SSR
    }
    return calculateItemsPerPageFromWindow();
  }, [windowHeight, isMounted]);

  // Notificar al padre cuando cambia itemsPerPage (solo después de montar)
  const prevItemsPerPageRef = useRef(itemsPerPage);
  useEffect(() => {
    if (isMounted && onItemsPerPageChange && prevItemsPerPageRef.current !== itemsPerPage) {
      prevItemsPerPageRef.current = itemsPerPage;
      onItemsPerPageChange(itemsPerPage);
    }
  }, [itemsPerPage, isMounted, onItemsPerPageChange]);

  // Calcular número total de páginas
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Determinar si es la carga inicial (mostrar skeleton) o cambio de página (mantener datos)
  const isInitialLoad = data.length === 0 && isLoading;

  // Función para renderizar skeleton por defecto
  const defaultRenderSkeletonRow = (index: number) => (
    <TableRow key={`skeleton-${index}`}>
      {columns.map((column) => (
        <TableCell key={column.key} className={column.className}>
          <Skeleton className="h-5 w-24" />
        </TableCell>
      ))}
    </TableRow>
  );

  const skeletonRenderer = renderSkeletonRow || defaultRenderSkeletonRow;

  return (
    <Container className="flex-1 p-4 flex flex-col text-gray-500 gap-2 min-h-0 overflow-hidden">
      {/* Estructura de tabla siempre presente para mantener el tamaño */}
      <div className="flex-1 overflow-hidden">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoad ? (
              // Skeleton: solo en la carga inicial, mostrar siempre itemsPerPage filas para mantener el tamaño
              Array.from({ length: itemsPerPage }).map((_, index) => skeletonRenderer(index))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12">
                  <p className="text-gray-500">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              // Datos reales: mostrar exactamente itemsPerPage filas (rellenar con vacías si es necesario)
              Array.from({ length: itemsPerPage }).map((_, index) => {
                const item = data[index];
                if (!item) {
                  // Fila vacía para mantener el tamaño si hay menos items que itemsPerPage
                  return (
                    <TableRow key={`empty-${index}`} className="opacity-0 pointer-events-none">
                      {columns.map((column) => (
                        <TableCell key={column.key} className={column.className}>
                          <div className="h-5" />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                }
                return renderRow(item, index);
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* Footer siempre presente para mantener el tamaño */}
      <div className="flex items-center justify-between border-t p-4 flex-shrink-0">
        {isInitialLoad ? (
          <>
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Mostrando {data.length} de {totalItems} {itemLabel}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) onPageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {(() => {
                  const pages: number[] = [];
                  
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else if (currentPage <= 3) {
                    for (let i = 1; i <= 5; i++) {
                      pages.push(i);
                    }
                  } else if (currentPage >= totalPages - 2) {
                    for (let i = totalPages - 4; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                      pages.push(i);
                    }
                  }
                  
                  return pages.map((pageNum: number) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onPageChange(pageNum);
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ));
                })()}
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) onPageChange(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}
      </div>
    </Container>
  );
}
