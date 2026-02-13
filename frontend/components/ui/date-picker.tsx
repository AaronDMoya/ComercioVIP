"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dateRef = React.useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;

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

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      onChange(formattedDate);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  return (
    <div ref={dateRef} className={cn("relative", className)}>
      <InputGroup
        className="cursor-pointer"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <InputGroupInput
          readOnly
          value={selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""}
          placeholder={placeholder}
          disabled={disabled}
          className="cursor-pointer"
        />
        <InputGroupAddon>
          {value ? (
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
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
          />
        </div>
      )}
    </div>
  );
}
