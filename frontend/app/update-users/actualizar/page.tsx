"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";
import {
  getRegistroByToken,
  actualizarRegistroByToken,
  type RegistroPublicResponse,
} from "@/lib/services/updateUsersService";
import { toast } from "sonner";
import { Loader2, Scale } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ActualizarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [registro, setRegistro] = useState<RegistroPublicResponse | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [saving, setSaving] = useState(false);
  const [asambleaNoDisponible, setAsambleaNoDisponible] = useState(false);
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [passwordValidated, setPasswordValidated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [validandoPassword, setValidandoPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getRegistroByToken(token)
      .then((data) => {
        setRegistro(data);
        // No prellenar los campos: la persona actualiza sin ver sus datos actuales
      })
      .catch((err: unknown) => {
        const e = err as Error & { status?: number };
        if (e.status === 410 || (e.message && e.message.includes("finalizado"))) {
          setAsambleaNoDisponible(true);
        } else {
          setRegistro(null);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const expectedPassword = registro
    ? `${(registro.cedula || "").trim()}${(registro.numero_torre || "").trim()}${(registro.numero_apartamento || "").trim()}`
    : "";

  const handleValidatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro) {
      return;
    }
    setValidandoPassword(true);
    try {
      const input = passwordInput.trim();
      if (input === expectedPassword) {
        setPasswordValidated(true);
        setShowPasswordDialog(false);
        toast.success("Contraseña correcta. Puede actualizar sus datos.");
      } else {
        toast.error("Contraseña incorrecta. Verifique sus datos e inténtelo nuevamente.");
      }
    } finally {
      setValidandoPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!passwordValidated) {
      toast.error("Debe validar la contraseña antes de actualizar los datos.");
      return;
    }
    setSaving(true);
    try {
      await actualizarRegistroByToken(token, {
        cedula: cedula.trim() || undefined,
        nombre: nombre.trim() || undefined,
        telefono: telefono.trim() || undefined,
        correo: correo.trim() || undefined,
      });
      router.push("/update-users/actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso no válido</h1>
          <p className="text-gray-600">
            Este enlace no es válido o ha expirado. Utilice el enlace que recibió por correo o
            ingrese con su número de torre y apartamento.
          </p>
          <Button
            className="mt-6"
            onClick={() => window.location.assign("/update-users/ingreso")}
          >
            Ir a ingreso
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

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

  if (!registro) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-gray-600">
            No se pudo cargar su registro. Verifique el enlace o contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  // Mientras no haya validado la contraseña, solo mostramos el diálogo (no el formulario)
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 bg-[linear-gradient(rgba(255,255,255,0.18)_3px,transparent_3px),linear-gradient(90deg,rgba(255,255,255,0.18)_3px,transparent_3px)] bg-[size:60px_60px] p-4">
        <div className="absolute top-4 left-4 bg-white rounded-lg p-2 flex gap-2 shadow-md">
          <Scale className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-semibold">Registros Votación</span>
        </div>
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              window.location.assign("/update-users/ingreso");
            }
          }}
        >
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Verificación de acceso</DialogTitle>
              <DialogDescription>
                Para acceder a la actualización de datos, ingrese la contraseña asignada.
                <br />
                La contraseña es: <strong>cédula + número de torre + número de apartamento</strong> (todo junto, sin espacios).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleValidatePassword} className="space-y-4">
              <div>
                <FieldLabel className="mb-1">Contraseña</FieldLabel>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoComplete="off"
                  placeholder="Ej: 1234567891101"
                  required
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.assign("/update-users/ingreso")}
                  disabled={validandoPassword}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={validandoPassword}>
                  {validandoPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Validar contraseña"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Contraseña validada: mostramos el formulario de actualización
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-200 bg-[linear-gradient(rgba(255,255,255,0.18)_3px,transparent_3px),linear-gradient(90deg,rgba(255,255,255,0.18)_3px,transparent_3px)] bg-[size:60px_60px] p-4">
      <div className="absolute top-4 left-4 bg-white rounded-lg p-2 flex gap-2 shadow-md">
        <Scale className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold">Registros Votación</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
          Actualizar mis datos
        </h1>
        <p className="text-gray-600 text-center text-sm mb-6">
          Asamblea: <strong>{registro.asamblea_title}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel className="mb-1">Cédula</FieldLabel>
            <Input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Cédula"
              autoComplete="off"
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Nombre</FieldLabel>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Teléfono</FieldLabel>
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Teléfono"
              type="tel"
              autoComplete="tel"
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Correo electrónico</FieldLabel>
            <Input
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Correo"
              type="email"
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ActualizarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-200">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      }
    >
      <ActualizarContent />
    </Suspense>
  );
}
