"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Registro } from "@/lib/services/registroService";

interface RegistroContextType {
  registroSeleccionado: Registro | null;
  seleccionarRegistro: (registro: Registro | null) => void;
  actualizarRegistro: (registro: Registro) => void;
}

const RegistroContext = createContext<RegistroContextType | undefined>(undefined);

export function RegistroProvider({ children }: { children: ReactNode }) {
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Registro | null>(null);

  const seleccionarRegistro = (registro: Registro | null) => {
    setRegistroSeleccionado(registro);
  };

  const actualizarRegistro = (registro: Registro) => {
    setRegistroSeleccionado(registro);
  };

  return (
    <RegistroContext.Provider value={{ registroSeleccionado, seleccionarRegistro, actualizarRegistro }}>
      {children}
    </RegistroContext.Provider>
  );
}

export function useRegistro() {
  const context = useContext(RegistroContext);
  if (context === undefined) {
    throw new Error("useRegistro must be used within a RegistroProvider");
  }
  return context;
}
