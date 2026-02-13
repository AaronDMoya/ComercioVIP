"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useAuth();

    // Redirigir al dashboard si el usuario ya está autenticado
    useEffect(() => {
        if (user) {
            if (user.is_admin) {
                router.push("/administrador/gestion-asambleas");
            } else {
                router.push("/operarios/panel");
            }
        }
    }, [user, router]);

    return (
      <>
        {children}
      </>
    );
}