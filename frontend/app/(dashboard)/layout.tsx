"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./sidebar";
import BottomNav from "./bottom-nav";
  
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    // Verificar si es la página de vista
    const isVistaPage = pathname?.includes("/vista");

    // Marcar como montado después de la hidratación
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirigir al login solo si terminó de cargar y el usuario no está autenticado
    // No redirigir si es la página de vista
    useEffect(() => {
        if (!isMounted || isLoading || isVistaPage) return;
        
        // Solo redirigir si ya terminó de verificar (isLoading === false) y no hay usuario
        if (user === null) {
            router.push("/login");
        }
    }, [user, isLoading, router, isMounted, isVistaPage]);

    // Mostrar loading mientras se verifica la autenticación
    if (isLoading || !isMounted) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    // Si no está cargando y no hay usuario, mostrar loading (será redirigido)
    // Excepto si es la página de vista
    if (user === null && !isVistaPage) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Redirigiendo al login...</p>
                </div>
            </div>
        );
    }

    // Si es la página de vista, mostrar sin sidebar ni bottom nav
    if (isVistaPage) {
        return <>{children}</>;
    }

    return (
      <SidebarProvider>
        {/* Sidebar solo visible en desktop */}
        <Sidebar className="hidden md:block">
          <SidebarContent>
            <AppSidebar />
          </SidebarContent>
        </Sidebar>
  
        <SidebarInset className="h-screen overflow-hidden flex flex-col pb-16 md:pb-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </SidebarInset>

        {/* Bottom Navigation solo visible en móvil */}
        <BottomNav />
  
      </SidebarProvider>
    );
  }