"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FieldLabel } from "@/components/ui/field"
import { UserPlus, Search, EyeIcon, EyeOffIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { CreateUserDialogProps } from "@/types/dialog"

/**
 * Dialog para crear un nuevo usuario
 * 
 * Permite registrar un nuevo usuario en el sistema con:
 * - Nombre completo
 * - Nombre de usuario
 * - Contraseña
 * - Rol (Operario o Administrador)
 */
export function CreateUserDialog({ trigger, onUserCreated }: CreateUserDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para el formulario de nuevo usuario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    username: "",
    password: "",
    confirmPassword: "",
    rol: "",
  });

  // Reglas de contraseña
  const passwordRules = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  // Validar si la contraseña cumple todas las reglas
  const isPasswordValid = Object.values(passwordRules).every(rule => rule === true);

  // Validar si las contraseñas coinciden
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      username: "",
      password: "",
      confirmPassword: "",
      rol: "",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Función para manejar el submit del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.username.trim() || !formData.password.trim()) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    // Validar reglas de contraseña
    if (!isPasswordValid) {
      toast.error("La contraseña no cumple con todos los requisitos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (!formData.rol) {
      toast.error("Por favor, selecciona un rol");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Creando usuario...");

    try {
      // Preparar los datos para enviar al backend
      const userData = {
        name: formData.nombre.trim(),
        last_name: formData.apellido.trim(),
        username: formData.username.trim(),
        password: formData.password,
        is_admin: formData.rol === "administrador",
      };

      const response = await apiFetch("/users/create", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        const user = await response.json();
        toast.success(`Usuario "${user.username}" creado exitosamente`);
        resetForm();
        setIsDialogOpen(false);
        // Llamar al callback para recargar la lista de usuarios
        if (onUserCreated) {
          onUserCreated();
        }
      } else {
        // Manejar errores del servidor
        let errorMessage = "Error al crear el usuario";
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            if (errorData.detail.includes("already exists")) {
              errorMessage = "El nombre de usuario ya existe. Elige otro.";
            } else {
              errorMessage = errorData.detail;
            }
          }
        } catch {
          if (response.status === 400) {
            errorMessage = "Datos inválidos. Verifica la información ingresada.";
          } else if (response.status === 401) {
            errorMessage = "No tienes permisos para realizar esta acción.";
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error al crear usuario:", error);
      toast.error("Error de conexión. Verifica que el servidor esté disponible.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="text-center animate-fade-in-down">
            <DialogTitle className="text-2xl font-bold">
              Registrar Nuevo Usuario
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Completa los datos para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 animate-fade-in-up">
          {/* Campo Rol */}
          <FieldLabel>Rol</FieldLabel>
          <Select
            value={formData.rol}
            onValueChange={(value) => setFormData({ ...formData, rol: value })}
            required
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Roles</SelectLabel>
                <SelectItem value="operario">Operario</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Campos Nombre y Apellido lado a lado */}
          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel>Nombre</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="text"
                  placeholder="Ingresa el nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <InputGroupAddon>
                  <UserPlus className="w-4 h-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div className="flex-1">
              <FieldLabel>Apellido</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="text"
                  placeholder="Ingresa el apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <InputGroupAddon>
                  <UserPlus className="w-4 h-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          {/* Campo Usuario */}
          <FieldLabel>Usuario</FieldLabel>
          <InputGroup>
            <InputGroupInput
              type="text"
              placeholder="Ingresa el nombre de usuario"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={isLoading}
            />
            <InputGroupAddon>
              <Search className="w-4 h-4" />
            </InputGroupAddon>
          </InputGroup>

          {/* Campo Contraseña */}
          <div>
            <FieldLabel>Contraseña</FieldLabel>
            <InputGroup className={formData.password.length > 0 && !isPasswordValid ? "border-red-500 focus-within:border-red-500" : ""}>
              <InputGroupAddon>
                <LockIcon className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="inline-end-input"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa la contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
              <InputGroupAddon
                align="inline-end"
                className="cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Campo Confirmar Contraseña */}
          <div>
            <FieldLabel>Confirmar Contraseña</FieldLabel>
            <InputGroup className={
              formData.confirmPassword.length > 0 && !passwordsMatch 
                ? "border-red-500 focus-within:border-red-500" 
                : formData.confirmPassword.length > 0 && passwordsMatch
                ? "border-green-500 focus-within:border-green-500"
                : ""
            }>
              <InputGroupAddon>
                <LockIcon className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="inline-end-input-confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirma la contraseña"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
              />
              <InputGroupAddon
                align="inline-end"
                className="cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
              </InputGroupAddon>
            </InputGroup>
            
            {/* Mensaje de validación de coincidencia */}
            {formData.confirmPassword.length > 0 && (
              <div className="mt-1.5 animate-fade-in-up">
                {passwordsMatch ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-green-100 text-green-600">✓</span>
                    Las contraseñas coinciden
                  </p>
                ) : (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-600">✗</span>
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reglas de contraseña - Siempre visibles */}
          <div className="mt-1 space-y-1.5">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Requisitos de contraseña:</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-xs transition-colors ${passwordRules.minLength ? "text-green-600" : "text-gray-500"}`}>
                <span className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${passwordRules.minLength ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {passwordRules.minLength ? "✓" : "○"}
                </span>
                Al menos 8 caracteres
              </div>
              <div className={`flex items-center gap-2 text-xs transition-colors ${passwordRules.hasUpperCase ? "text-green-600" : "text-gray-500"}`}>
                <span className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${passwordRules.hasUpperCase ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {passwordRules.hasUpperCase ? "✓" : "○"}
                </span>
                Una letra mayúscula
              </div>
              <div className={`flex items-center gap-2 text-xs transition-colors ${passwordRules.hasLowerCase ? "text-green-600" : "text-gray-500"}`}>
                <span className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${passwordRules.hasLowerCase ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {passwordRules.hasLowerCase ? "✓" : "○"}
                </span>
                Una letra minúscula
              </div>
              <div className={`flex items-center gap-2 text-xs transition-colors ${passwordRules.hasNumber ? "text-green-600" : "text-gray-500"}`}>
                <span className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${passwordRules.hasNumber ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {passwordRules.hasNumber ? "✓" : "○"}
                </span>
                Un número
              </div>
              <div className={`flex items-center gap-2 text-xs transition-colors ${passwordRules.hasSpecialChar ? "text-green-600" : "text-gray-500"}`}>
                <span className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors ${passwordRules.hasSpecialChar ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {passwordRules.hasSpecialChar ? "✓" : "○"}
                </span>
                Un carácter especial (!@#$%^&*...)
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
