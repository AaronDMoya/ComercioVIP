"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container";
import { CreateUserDialog } from "@/components/dialog/CreateUserDialog"
import { EditUserDialog } from "@/components/dialog/EditUserDialog"
import { Search, Edit, UserPlus } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { TableRow, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUsers, type User } from "@/lib/services/userService"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/my-ui/DataTable"
import { Skeleton } from "@/components/ui/skeleton"

export default function SearchOperarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRol, setFilterRol] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Estado para el diálogo de editar usuario
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Estado para itemsPerPage calculado por DataTable
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Cargar usuarios
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (filterRol !== "all") {
        params.is_admin = filterRol === "administrador";
      }

      const response = await getUsers(params);
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast.error("Error al cargar los usuarios");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, filterRol]);

  // Cargar usuarios cuando cambian los filtros, la página o itemsPerPage
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Función para manejar la búsqueda con debounce
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Resetear a la primera página al buscar
  };

  // Función para manejar el cambio de filtro de rol
  const handleFilterRol = (value: string) => {
    setFilterRol(value);
    setCurrentPage(1);
  };

  // Definir columnas de la tabla
  const columns: Column<User>[] = [
    { key: "usuario", label: "Usuarios" },
    { key: "rol", label: "Rol" },
    { key: "acciones", label: "Acciones", className: "text-right" },
  ];
  
  // Función para renderizar skeleton personalizado
  const renderSkeletonRow = (index: number) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 ml-auto" />
      </TableCell>
    </TableRow>
  );
  
  // Función para renderizar cada fila de usuario
  const renderUserRow = (user: User, index: number) => (
    <TableRow 
      key={user.id}
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(user)} flex items-center justify-center text-white font-semibold text-sm`}>
            {getInitials(user)}
          </div>
          <span>{getFullName(user)}</span>
        </div>
      </TableCell>
      <TableCell>{getRolLabel(user.is_admin)}</TableCell>
      <TableCell className="text-right">
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 transition-transform duration-200 hover:scale-110"
          onClick={() => {
            setEditingUser(user);
            setIsEditDialogOpen(true);
          }}
        >
          <Edit className="w-4 h-4" />
          <span className="sr-only">Editar usuario</span>
        </Button>
      </TableCell>
    </TableRow>
  );

  // Función para obtener el nombre completo
  const getFullName = (user: User) => {
    return `${user.name} ${user.last_name}`;
  };

  // Función para obtener el rol en español
  const getRolLabel = (isAdmin: boolean) => {
    return isAdmin ? "Administrador" : "Operario";
  };

  // Función para obtener iniciales del usuario
  const getInitials = (user: User) => {
    const firstInitial = user.name?.[0]?.toUpperCase() || "";
    const lastInitial = user.last_name?.[0]?.toUpperCase() || "";
    return `${firstInitial}${lastInitial}` || "U";
  };

  // Función para obtener el color del avatar basado en la inicial
  const getAvatarColor = (user: User) => {
    const initial = (user.name?.[0]?.toUpperCase() || user.last_name?.[0]?.toUpperCase() || "U").charCodeAt(0);
    
    // Mapear la inicial a un color usando el código ASCII
    // Usamos módulo para obtener un índice entre 0-25 (A-Z)
    const colorIndex = (initial - 65) % 26;
    
    // Paleta de colores vibrantes y contrastantes
    const colors = [
      "bg-blue-600",    // A
      "bg-purple-600",   // B
      "bg-pink-600",     // C
      "bg-red-600",      // D
      "bg-orange-600",   // E
      "bg-amber-600",    // F
      "bg-yellow-600",   // G
      "bg-lime-600",     // H
      "bg-green-600",    // I
      "bg-emerald-600",  // J
      "bg-teal-600",     // K
      "bg-cyan-600",     // L
      "bg-sky-600",      // M
      "bg-indigo-600",   // N
      "bg-violet-600",   // O
      "bg-fuchsia-600",  // P
      "bg-rose-600",     // Q
      "bg-red-500",      // R
      "bg-orange-500",   // S
      "bg-amber-500",    // T
      "bg-yellow-500",   // U
      "bg-lime-500",     // V
      "bg-green-500",    // W
      "bg-emerald-500",  // X
      "bg-teal-500",     // Y
      "bg-cyan-500",     // Z
    ];
    
    return colors[colorIndex] || "bg-gray-600";
  };
  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in min-h-0 flex-1">
      {/* Container de búsqueda */}
      <Container className="flex flex-col gap-4 p-4 w-full animate-fade-in-down flex-shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Input de búsqueda */}
          <div className="flex-1 w-full">
            <InputGroup>
              <InputGroupInput 
                placeholder="Buscar usuarios por nombre, apellido o usuario" 
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <InputGroupAddon>
                <Search/>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Rol:</label>
              <Select value={filterRol} onValueChange={handleFilterRol}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Rol del Usuario</SelectLabel>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="operario">Operario</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CreateUserDialog
            trigger={
              <Button className="h-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <UserPlus/>
                Registrar Usuario
              </Button>
            }
            onUserCreated={loadUsers}
          />
        </div>
      </Container>
      {/* Container de resultados con DataTable */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        totalItems={totalUsers}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        renderRow={renderUserRow}
        renderSkeletonRow={renderSkeletonRow}
        emptyMessage="No se encontraron usuarios"
        itemLabel="usuarios"
        onItemsPerPageChange={setItemsPerPage}
      />
      
      {/* Dialog para editar usuario */}
      <EditUserDialog
        user={editingUser}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUserUpdated={loadUsers}
      />
    </div>
  );
}