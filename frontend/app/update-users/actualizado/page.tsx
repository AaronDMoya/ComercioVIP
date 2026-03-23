"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Scale, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ActualizadoContent() {
  const searchParams = useSearchParams();
  const asambleaId = searchParams.get("asamblea");
  const ingresoHref = asambleaId
    ? `/update-users/ingreso?asamblea=${encodeURIComponent(asambleaId)}`
    : "/update-users/ingreso";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 bg-[linear-gradient(rgba(255,255,255,0.18)_3px,transparent_3px),linear-gradient(90deg,rgba(255,255,255,0.18)_3px,transparent_3px)] bg-[size:60px_60px] p-4">
      <div className="absolute top-4 left-4 bg-white rounded-lg p-2 flex gap-2 shadow-md">
        <Scale className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold">Registros Votación</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Datos actualizados correctamente
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Sus datos han sido guardados. Puede cerrar esta página o volver al inicio si lo desea.
        </p>
        <Button asChild className="w-full" size="lg">
          <Link href={ingresoHref}>Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ActualizadoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-200">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      }
    >
      <ActualizadoContent />
    </Suspense>
  );
}
