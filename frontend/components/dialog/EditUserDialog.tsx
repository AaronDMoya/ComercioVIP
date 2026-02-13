"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FieldLabel } from "@/components/ui/field"
import { UserPlus, Search, EyeIcon, EyeOffIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { User } from "@/lib/services/userService"

/**
 * Props para el diálogo de editar usuario
 */
export interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

/**
 * Dialog para editar un usuario existente
 * 
 * Permite modificar los datos de un usuario:
 * - Nombre completo
 * - Nombre de usuario
 * - Rol (Operario o Administrador)
 * - Contraseña (opcional, requiere contraseña anterior)
 */
export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para el formulario de edición
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    username: "",
    rol: "",
    password: "",
    confirmPassword: "",
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
  const isPasswordValid = formData.password.length === 0 || Object.values(passwordRules).every(rule => rule === true);

  // Validar si las contraseñas coinciden
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Verificar si se está intentando cambiar la contraseña
  const isChangingPassword = formData.password.length > 0 || formData.confirmPassword.length > 0;

  // Cargar datos del usuario cuando se abre el diálogo
  useEffect(() => {
    if (user && open) {
      setFormData({
        nombre: user.name || "",
        apellido: user.last_name || "",
        username: user.username || "",
        rol: user.is_admin ? "administrador" : "operario",
        password: "",
        confirmPassword: "",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user, open]);

  // Función para resetear el formulario
  const resetForm = () => {
    if (user) {
      setFormData({
        nombre: user.name || "",
        apellido: user.last_name || "",
        username: user.username || "",
        rol: user.is_admin ? "administrador" : "operario",
        password: "",
        confirmPassword: "",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  };

  // Función para manejar el submit del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validaciones básicas
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.username.trim()) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    if (!formData.rol) {
      toast.error("Por favor, selecciona un rol");
      return;
    }

    // Validaciones de contraseña si se está intentando cambiar
    if (isChangingPassword) {
      // Si se proporciona nueva contraseña, validar reglas
      if (formData.password.trim()) {
        // Validar reglas de contraseña
        if (!isPasswordValid) {
          toast.error("La contraseña no cumple con todos los requisitos");
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast.error("Las contraseñas no coinciden");
          return;
        }
      }
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Actualizando usuario...");

    try {
      // Preparar los datos para enviar al backend
      const userData: any = {
        name: formData.nombre.trim(),
        last_name: formData.apellido.trim(),
        username: formData.username.trim(),
        is_admin: formData.rol === "administrador",
      };

      // Solo incluir nueva contraseña si se está cambiando
      if (formData.password.trim()) {
        userData.new_password = formData.password;
      }

      const response = await apiFetch(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        const updatedUser = await response.json();
        toast.success(`Usuario "${updatedUser.username}" actualizado exitosamente`);
        onOpenChange(false);
        // Llamar al callback para recargar la lista de usuarios
        if (onUserUpdated) {
          onUserUpdated();
        }
      } else {
        // Manejar errores del servidor
        let errorMessage = "Error al actualizar el usuario";
        
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
          } else if (response.status === 404) {
            errorMessage = "Usuario no encontrado.";
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error al actualizar usuario:", error);
      toast.error("Error de conexión. Verifica que el servidor esté disponible.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="text-center animate-fade-in-down">
            <DialogTitle className="text-2xl font-bold">
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Modifica los datos del usuario en el sistema.
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

          {/* Campo Nueva Contraseña */}
          <div>
            <FieldLabel>Nueva Contraseña (opcional)</FieldLabel>
            <InputGroup className={formData.password.length > 0 && !isPasswordValid ? "border-red-500 focus-within:border-red-500" : ""}>
              <InputGroupAddon>
                <LockIcon className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa la nueva contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

          {/* Campo Confirmar Nueva Contraseña */}
          <div>
            <FieldLabel>Confirmar Nueva Contraseña (opcional)</FieldLabel>
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
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirma la nueva contraseña"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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

          {/* Reglas de contraseña - Solo mostrar si se está ingresando una contraseña */}
          {formData.password.length > 0 && (
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
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
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
              {isLoading ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
