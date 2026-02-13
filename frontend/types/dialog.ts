/**
 * Tipos relacionados con diálogos y modales
 */

/**
 * Props para el diálogo de crear usuario
 */
export interface CreateUserDialogProps {
    trigger?: React.ReactNode;
    onUserCreated?: () => void;  // Callback cuando se crea un usuario exitosamente
}

/**
 * Props para el diálogo de cerrar sesión
 */
export interface LogoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
