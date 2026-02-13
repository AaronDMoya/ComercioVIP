"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  fechaDesde?: string;
  fechaHasta?: string;
  onFechaDesdeChange: (value: string) => void;
  onFechaHastaChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dateRef = React.useRef<HTMLDivElement>(null);

  // Convertir las fechas a DateRange
  const dateRange: DateRange | undefined = React.useMemo(() => {
    const from = fechaDesde ? new Date(fechaDesde) : undefined;
    const to = fechaHasta ? new Date(fechaHasta) : undefined;
    
    if (from || to) {
      return { from, to };
    }
    return undefined;
  }, [fechaDesde, fechaHasta]);

  // Cerrar el calendario al hacer clic fuera
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      const formattedFrom = format(range.from, "yyyy-MM-dd");
      onFechaDesdeChange(formattedFrom);
    } else {
      onFechaDesdeChange("");
    }

    if (range?.to) {
      const formattedTo = format(range.to, "yyyy-MM-dd");
      onFechaHastaChange(formattedTo);
    } else {
      onFechaHastaChange("");
    }

    // Cerrar cuando se selecciona el rango completo
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFechaDesdeChange("");
    onFechaHastaChange("");
    setIsOpen(false);
  };

  // Formatear el texto del rango
  const getRangeText = () => {
    if (fechaDesde && fechaHasta) {
      return `${format(new Date(fechaDesde), "dd/MM/yyyy")} - ${format(new Date(fechaHasta), "dd/MM/yyyy")}`;
    } else if (fechaDesde) {
      return `Desde: ${format(new Date(fechaDesde), "dd/MM/yyyy")}`;
    } else if (fechaHasta) {
      return `Hasta: ${format(new Date(fechaHasta), "dd/MM/yyyy")}`;
    }
    return "Seleccionar rango de fechas";
  };

  return (
    <div ref={dateRef} className={cn("relative", className)}>
      <InputGroup
        className="cursor-pointer"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <InputGroupInput
          readOnly
          value={getRangeText()}
          placeholder="Seleccionar rango de fechas"
          disabled={disabled}
          className="cursor-pointer"
        />
        <InputGroupAddon>
          {(fechaDesde || fechaHasta) ? (
            <X
              className="w-4 h-4 cursor-pointer hover:text-red-500"
              onClick={handleClear}
            />
          ) : (
            <CalendarIcon className="w-4 h-4" />
          )}
        </InputGroupAddon>
      </InputGroup>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            initialFocus
          />
        </div>
      )}
    </div>
  );
}
