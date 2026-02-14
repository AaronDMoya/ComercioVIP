"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FilePenLine,
  Users,
  ClipboardList,
  Scale,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutDialog } from "@/components/dialog/LogoutDialog";

const adminMenu = {
  section: "ADMINISTRADOR",
  items: [
    { label: "Gestión Asambleas", href: "/administrador/gestion-asambleas", icon: ClipboardList },
    { label: "Gestión Usuarios", href: "/administrador/gestion-usuarios", icon: Users },
  ],
};

const operarioMenu = {
  section: "OPERARIOS",
  items: [
    { label: "Panel", href: "/operarios/panel", icon: LayoutDashboard },
    { label: "Digitar", href: "/operarios/digitar", icon: FilePenLine },
    { label: "Registros", href: "/operarios/registros", icon: ClipboardList },
  ],
};

export default function AppSidebar() {
  // router para navegar entre las rutas
  const router = useRouter();
  const { user } = useAuth();
  const pathname = usePathname();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Filtrar el menú según el rol del usuario
  const getMenuItems = () => {
    if (!user) return [];
    
    if (user.is_admin) {
      // Si es admin, muestra todas las opciones
      return [adminMenu, operarioMenu];
    } else {
      // Si no es admin, solo muestra opciones de operario
      return [operarioMenu];
    }
  };


  // Obtener nombre completo del usuario
  const getUserDisplayName = () => {
    if (user?.name && user?.last_name) {
      return `${user.name} ${user.last_name}`;
    }
    return user?.username || "Usuario";
  };

  const getUserRole = () => {
    return user?.is_admin ? "Administrador" : "Operario";
  };

  const menu = getMenuItems();

  return (
    <div className="flex flex-col justify-between h-screen bg-white border-r p-3 animate-fade-in">
      {/* Logo / Título */}
      <div>
        <div className="p-2 flex items-center gap-2 mb-4 animate-fade-in-down hover-lift transition-smooth">
          <Scale className="w-10 h-10 text-white bg-blue-600 p-2 rounded-lg transition-transform duration-300 hover:rotate-12" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Sistema Asamblea PRO</h1>
            <p className="text-xs text-gray-500">v1.0.0</p>
          </div>
        </div>

        <SidebarMenu>
          {menu.map((section, sectionIndex) => (
            <SidebarMenuItem key={section.section} className="animate-fade-in-up" style={{ animationDelay: `${sectionIndex * 0.1}s`, animationFillMode: "both" }}>
              <p className="px-2 py-1 text-xs text-gray-500 font-semibold">{section.section}</p>

              <SidebarMenuSub>
                {section.items.map((item, itemIndex) => {
                  const active = pathname === item.href;

                  return (
                    <SidebarMenuSubItem key={item.href} className="animate-slide-in-left" style={{ animationDelay: `${(sectionIndex * 0.1) + (itemIndex * 0.05)}s`, animationFillMode: "both" }}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={`
                          transition-all duration-200
                          rounded-md
                          data-[active=true]:bg-blue-100
                          data-[active=true]:text-blue-600
                          data-[active=true]:font-medium
                          data-[active=true]:shadow-sm
                          hover:bg-blue-50
                          hover:text-blue-600
                          hover:translate-x-1
                          px-2 py-1
                          group
                        `}
                      >
                        <Link href={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>

      {/* Usuario logeado */}
      {user && (
        <div className="flex items-center justify-between mt-4 p-2 bg-gray-50 rounded-lg border animate-fade-in-up hover:shadow-md transition-smooth">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm transition-transform duration-200 hover:scale-110">
              {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500">{getUserRole()}</p>
            </div>
          </div>

          {/* Botón de cerrar sesión */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowLogoutDialog(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 transition-transform duration-200 hover:scale-110"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Diálogo de confirmación para cerrar sesión */}
      <LogoutDialog 
        open={showLogoutDialog} 
        onOpenChange={setShowLogoutDialog} 
      />
    </div>
  );
}
