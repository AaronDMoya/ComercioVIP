"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    // Marcar como montado después de la hidratación
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirigir al dashboard si el usuario ya está autenticado
    // Solo hacerlo después de que termine de verificar la autenticación
    useEffect(() => {
        if (!isMounted || isLoading) return;
        
        if (user) {
            if (user.is_admin) {
                router.push("/administrador/gestion-asambleas");
            } else {
                router.push("/operarios/panel");
            }
        }
    }, [user, isLoading, router, isMounted]);

    return (
      <>
        {children}
      </>
    );
}