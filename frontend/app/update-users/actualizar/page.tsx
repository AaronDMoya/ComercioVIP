"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

export default function ActualizarPage() {
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

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getRegistroByToken(token)
      .then((data) => {
        setRegistro(data);
        setCedula(data.cedula || "");
        setNombre(data.nombre || "");
        setTelefono(data.telefono || "");
        setCorreo(data.correo || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await actualizarRegistroByToken(token, {
        cedula: cedula.trim() || undefined,
        nombre: nombre.trim() || undefined,
        telefono: telefono.trim() || undefined,
        correo: correo.trim() || undefined,
      });
      toast.success("Datos actualizados correctamente.");
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
