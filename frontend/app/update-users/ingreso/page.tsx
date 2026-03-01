"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ingreso } from "@/lib/services/updateUsersService";
import { toast } from "sonner";
import { Loader2, Scale } from "lucide-react";

export default function IngresoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const asambleaId = searchParams.get("asamblea") ?? "";

  const [numeroTorre, setNumeroTorre] = useState("");
  const [numeroApto, setNumeroApto] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [asambleaNoDisponible, setAsambleaNoDisponible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = numeroTorre.trim();
    const a = numeroApto.trim();
    if (!t || !a) {
      toast.error("Ingrese número de torre y apartamento");
      return;
    }
    if (!asambleaId) {
      toast.error("Falta el identificador de la asamblea en el enlace.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!asambleaId) return;
    setIsSubmitting(true);
    try {
      const { token } = await ingreso(asambleaId, numeroTorre.trim(), numeroApto.trim());
      setShowConfirm(false);
      toast.success("Datos correctos. Redirigiendo...");
      router.push(`/update-users/actualizar?token=${encodeURIComponent(token)}`);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 410 || (e.message && e.message.includes("finalizado"))) {
        setAsambleaNoDisponible(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Error al ingresar");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (asambleaNoDisponible) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ya no se encuentra disponible</h1>
          <p className="text-gray-600">
            Esta asamblea ha finalizado y ya no permite actualizar datos. Si tiene dudas, contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 p-4">
      <div className="absolute top-4 left-4 bg-white rounded-lg p-2 flex gap-2 shadow-md">
        <Scale className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold">Registros Votación</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Ingreso a actualización de datos
        </h1>
        <p className="text-gray-600 text-center text-sm mb-6">
          Ingrese su número de torre y apartamento para acceder al formulario de actualización.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel className="mb-1">N° Torre</FieldLabel>
            <Input
              value={numeroTorre}
              onChange={(e) => setNumeroTorre(e.target.value)}
              placeholder="Ej: 1"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <FieldLabel className="mb-1">N° Apartamento</FieldLabel>
            <Input
              value={numeroApto}
              onChange={(e) => setNumeroApto(e.target.value)}
              placeholder="Ej: 101"
              required
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Continuar
          </Button>
        </form>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar datos</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que el número de torre <strong>{numeroTorre.trim()}</strong> y el
              número de apartamento <strong>{numeroApto.trim()}</strong> son correctos y le
              corresponden?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sí, son correctos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
