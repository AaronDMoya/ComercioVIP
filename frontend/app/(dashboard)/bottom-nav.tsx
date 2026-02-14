"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FilePenLine,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminMenu = {
  items: [
    { label: "Asambleas", href: "/administrador/gestion-asambleas", icon: ClipboardList },
    { label: "Usuarios", href: "/administrador/gestion-usuarios", icon: Users },
  ],
};

const operarioMenu = {
  items: [
    { label: "Panel", href: "/operarios/panel", icon: LayoutDashboard },
    { label: "Digitar", href: "/operarios/digitar", icon: FilePenLine },
    { label: "Registros", href: "/operarios/registros", icon: ClipboardList },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  // Marcar como montado después de la hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // No renderizar hasta que esté montado para evitar errores de hidratación
  if (!isMounted) {
    return null;
  }

  const getMenuItems = () => {
    if (!user) return [];
    
    if (user.is_admin) {
      return [...adminMenu.items, ...operarioMenu.items];
    } else {
      return operarioMenu.items;
    }
  };

  const menuItems = getMenuItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {menuItems.map((item) => {
          const active = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors",
                active
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform",
                active && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full px-1",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
