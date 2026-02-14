"use client";

import { useState, useEffect } from "react";
import { UserIcon, EyeOffIcon, LockIcon, LogInIcon, EyeIcon  } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
    // router para navegar entre las rutas
    const router = useRouter();
    const { login, user, isLoading: authLoading } = useAuth();
    
    // Estados para los campos del formulario
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Marcar como montado después de la hidratación
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirigir si el usuario ya está autenticado
    // Solo hacerlo después de que termine de verificar la autenticación
    useEffect(() => {
        if (!isMounted || authLoading) return;
        
        if (user) {
            if (user.is_admin) {
                router.push("/administrador/gestion-asambleas");
            } else {
                router.push("/operarios/panel");
            }
        }
    }, [user, authLoading, router, isMounted]);

    // función para manejar el submit del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validación básica
        if (!username.trim() || !password.trim()) {
            toast.error("Por favor, completa todos los campos");
            return;
        }

        setIsLoading(true);
        
        // Mostrar toast de carga
        const loadingToast = toast.loading("Validando credenciales...");
        
        try {
            const result = await login(username, password);
            
            // Cerrar el toast de carga
            toast.dismiss(loadingToast);
            
            if (result.success) {
                toast.success("Ingreso exitoso");
                // Esperar a que el contexto se actualice antes de redirigir
                // El useEffect se encargará de la redirección cuando user cambie
            } else {
                // Mostrar el mensaje de error específico
                toast.error(result.error || "Usuario o contraseña incorrectos");
            }
        } catch (error) {
            // Cerrar el toast de carga en caso de error
            toast.dismiss(loadingToast);
            toast.error("Error al iniciar sesión. Intenta nuevamente.");
            console.error("Error en login:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return(
        <div className="w-[360px] bg-white rounded-lg p-8 flex flex-col gap-3 shadow-xl animate-scale-in">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="text-center animate-fade-in-down">
                    <h1 className="text-2xl font-bold">
                        Iniciar sesión
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Ingresa sesión con tus credenciales
                    </p>
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                    <FieldLabel> Usuario: </FieldLabel>
                    <InputGroup className="transition-smooth hover:shadow-md focus-within:shadow-md focus-within:border-blue-500">
                        <InputGroupInput 
                            type="text" 
                            placeholder="Ingresa tu usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            required
                            className="transition-smooth"
                        />
                        <InputGroupAddon className="transition-transform duration-200 group-hover/input-group:scale-110">
                            <UserIcon/>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                    <FieldLabel> Contraseña: </FieldLabel>
                    <InputGroup className="transition-smooth hover:shadow-md focus-within:shadow-md focus-within:border-blue-500">
                        <InputGroupAddon className="transition-transform duration-200 group-hover/input-group:scale-110">
                            <LockIcon/>
                        </InputGroupAddon>
                        <InputGroupInput
                            id="inline-end-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="Ingresa tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                            className="transition-smooth"
                        />
                        <InputGroupAddon 
                            align="inline-end"
                            className="cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeIcon/> : <EyeOffIcon/>}
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 disabled:opacity-50 transition-smooth hover-lift active:scale-95"
                    >
                        {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        <LogInIcon className="transition-transform duration-200 group-hover:translate-x-1"/>
                    </Button>
                </div>
            </form>
        </div>
    );
}