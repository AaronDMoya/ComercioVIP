"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./sidebar";
  
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const router = useRouter();
    const { user } = useAuth();

    // Redirigir al login si el usuario no está autenticado
    useEffect(() => {
        if (user === null) {
            // Esperar un momento para que el AuthContext termine de cargar
            // Esto evita redirecciones innecesarias durante la carga inicial
            const timer = setTimeout(() => {
                if (user === null) {
                    router.push("/login");
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [user, router]);

    // Mostrar loading mientras se verifica la autenticación
    if (user === null) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    return (
      <SidebarProvider>
  
        <Sidebar>
          <SidebarContent>
            <AppSidebar />
          </SidebarContent>
        </Sidebar>
  
        <SidebarInset className="h-screen overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </SidebarInset>
  
      </SidebarProvider>
    );
  }