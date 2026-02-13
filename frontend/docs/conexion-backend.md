# Guía de Conexión Frontend-Backend

Esta guía te ayudará a entender cómo conectar el frontend (Next.js) con el backend (FastAPI) para realizar operaciones como crear usuarios, obtener datos, etc.

## 📋 Tabla de Contenidos

1. [Estructura del Backend](#estructura-del-backend)
2. [Configuración del Frontend](#configuración-del-frontend)
3. [Función Helper: apiFetch](#función-helper-apifetch)
4. [Ejemplo: Crear un Usuario](#ejemplo-crear-un-usuario)
5. [Manejo de Errores](#manejo-de-errores)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ Estructura del Backend

### Endpoints Disponibles

El backend tiene los siguientes endpoints principales:

- **POST** `/users/create/` - Crear un nuevo usuario
- **POST** `/auth/login` - Iniciar sesión
- **GET** `/auth/me` - Obtener usuario actual
- **POST** `/auth/logout` - Cerrar sesión

### Schema de Datos

#### Para crear un usuario (UserCreate):
```typescript
{
  name: string;        // Nombre del usuario
  last_name: string;  // Apellido del usuario
  username: string;   // Nombre de usuario (único)
  password: string;   // Contraseña
}
```

#### Respuesta del servidor (UserResponse):
```typescript
{
  id: string;         // UUID del usuario
  name: string;
  last_name: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
}
```

---

## ⚙️ Configuración del Frontend

### 1. Variable de Entorno

Asegúrate de tener configurada la variable de entorno `NEXT_PUBLIC_API_URL` en tu archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Nota:** En Next.js, las variables de entorno que se usan en el cliente deben comenzar con `NEXT_PUBLIC_`.

### 2. Archivo de Configuración de API

El proyecto ya tiene un archivo `lib/api.ts` que contiene la función helper `apiFetch`. Esta función:

- Combina automáticamente la URL base con el endpoint
- Incluye las credenciales (cookies) en cada petición
- Establece el `Content-Type` como `application/json`
- Maneja errores básicos

---

## 🔧 Función Helper: apiFetch

### Ubicación
`frontend/lib/api.ts`

### Uso Básico

```typescript
import { apiFetch } from "@/lib/api";

// GET request
const response = await apiFetch("/auth/me");

// POST request
const response = await apiFetch("/users/create/", {
  method: "POST",
  body: JSON.stringify({
    name: "Juan",
    last_name: "Pérez",
    username: "juanperez",
    password: "contraseña123"
  })
});
```

### Características

- ✅ Envía cookies automáticamente (para mantener la sesión)
- ✅ Configura headers por defecto
- ✅ Valida que la URL base esté configurada
- ✅ Maneja errores de conexión

---

## 📝 Ejemplo: Crear un Usuario

### Paso 1: Crear un Tipo TypeScript (Opcional pero Recomendado)

Crea un archivo `types/user.ts`:

```typescript
// frontend/types/user.ts

export interface UserCreate {
  name: string;
  last_name: string;
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  last_name: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
}
```

### Paso 2: Crear una Función de Servicio

Crea un archivo `lib/services/userService.ts`:

```typescript
// frontend/lib/services/userService.ts

import { apiFetch } from "@/lib/api";
import type { UserCreate, UserResponse } from "@/types/user";

export interface CreateUserResult {
  success: boolean;
  data?: UserResponse;
  error?: string;
}

/**
 * Crea un nuevo usuario en el sistema
 * 
 * @param userData - Datos del usuario a crear
 * @returns Resultado de la operación con el usuario creado o mensaje de error
 */
export async function createUser(userData: UserCreate): Promise<CreateUserResult> {
  try {
    const response = await apiFetch("/users/create/", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const data: UserResponse = await response.json();
      return {
        success: true,
        data,
      };
    }

    // Si la respuesta no es exitosa, intentar obtener el mensaje de error
    let errorMessage = "Error al crear el usuario";
    
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Si no se puede parsear el JSON, usar el mensaje por defecto
      if (response.status === 400) {
        errorMessage = "Datos inválidos. Verifica la información ingresada.";
      } else if (response.status === 409) {
        errorMessage = "El nombre de usuario ya existe.";
      } else {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    // Error de red o conexión
    console.error("Error al crear usuario:", error);
    return {
      success: false,
      error: "Error de conexión. Verifica que el servidor esté disponible.",
    };
  }
}
```

### Paso 3: Usar la Función en un Componente

Ejemplo de formulario para crear usuario:

```typescript
// frontend/app/(dashboard)/administrador/gestion-usuarios/createUserForm.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { createUser } from "@/lib/services/userService";

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mostrar toast de carga
    const loadingToast = toast.loading("Creando usuario...");

    try {
      const result = await createUser(formData);

      // Cerrar el toast de carga
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success("Usuario creado exitosamente");
        // Limpiar el formulario
        setFormData({
          name: "",
          last_name: "",
          username: "",
          password: "",
        });
        // Aquí podrías recargar la lista de usuarios o redirigir
      } else {
        toast.error(result.error || "Error al crear el usuario");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error inesperado. Intenta nuevamente.");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <FieldLabel>Nombre</FieldLabel>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <FieldLabel>Apellido</FieldLabel>
        <Input
          type="text"
          value={formData.last_name}
          onChange={(e) =>
            setFormData({ ...formData, last_name: e.target.value })
          }
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <FieldLabel>Usuario</FieldLabel>
        <Input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <FieldLabel>Contraseña</FieldLabel>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creando..." : "Crear Usuario"}
      </Button>
    </form>
  );
}
```

---

## ⚠️ Manejo de Errores

### Códigos de Estado HTTP Comunes

- **200 OK**: Operación exitosa
- **400 Bad Request**: Datos inválidos
- **401 Unauthorized**: No autenticado
- **403 Forbidden**: Sin permisos
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto (ej: usuario ya existe)
- **500 Internal Server Error**: Error del servidor

### Ejemplo de Manejo de Errores Mejorado

```typescript
export async function createUser(userData: UserCreate): Promise<CreateUserResult> {
  try {
    const response = await apiFetch("/users/create/", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }

    // Manejo específico por código de estado
    switch (response.status) {
      case 400:
        return {
          success: false,
          error: "Datos inválidos. Verifica la información ingresada.",
        };
      case 409:
        return {
          success: false,
          error: "El nombre de usuario ya existe. Elige otro.",
        };
      case 401:
        return {
          success: false,
          error: "No tienes permisos para realizar esta acción.",
        };
      default:
        return {
          success: false,
          error: "Error al crear el usuario. Intenta nuevamente.",
        };
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Error de conexión. Verifica que el servidor esté disponible.",
      };
    }
    return {
      success: false,
      error: "Error inesperado. Intenta nuevamente.",
    };
  }
}
```

---

## ✅ Mejores Prácticas

### 1. **Separar la Lógica de Negocio**

Crea funciones de servicio en `lib/services/` en lugar de poner toda la lógica en los componentes.

```
frontend/
  lib/
    services/
      userService.ts
      asambleaService.ts
      ...
```

### 2. **Usar TypeScript para Tipos**

Define interfaces TypeScript que coincidan con los schemas del backend:

```typescript
// types/user.ts
export interface UserCreate {
  name: string;
  last_name: string;
  username: string;
  password: string;
}
```

### 3. **Manejar Estados de Carga**

Siempre muestra un estado de carga mientras se procesa la petición:

```typescript
const [isLoading, setIsLoading] = useState(false);

// En el componente
{isLoading ? "Cargando..." : "Enviar"}
```

### 4. **Mostrar Feedback al Usuario**

Usa toasts (sonner) para informar al usuario sobre el resultado:

```typescript
toast.success("Operación exitosa");
toast.error("Error al procesar");
toast.loading("Procesando...");
```

### 5. **Validar Datos en el Frontend**

Valida los datos antes de enviarlos al backend:

```typescript
if (!formData.username.trim()) {
  toast.error("El nombre de usuario es requerido");
  return;
}

if (formData.password.length < 6) {
  toast.error("La contraseña debe tener al menos 6 caracteres");
  return;
}
```

### 6. **Manejar Errores de Red**

Siempre incluye un try-catch para manejar errores de conexión:

```typescript
try {
  const result = await createUser(data);
} catch (error) {
  // Manejar error de red
  console.error("Error de conexión:", error);
  toast.error("Error de conexión");
}
```

### 7. **Reutilizar Funciones**

Si necesitas crear usuarios en múltiples lugares, usa la función de servicio en lugar de duplicar código.

---

## 📚 Ejemplo Completo: Flujo de Creación de Usuario

```typescript
// 1. Usuario completa el formulario
// 2. Se valida la información
// 3. Se muestra un toast de carga
// 4. Se llama a la función createUser()
// 5. Se procesa la respuesta:
//    - Si es exitosa: mostrar éxito y limpiar formulario
//    - Si falla: mostrar mensaje de error específico
// 6. Se actualiza la UI según corresponda
```

---

## 🔗 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de FastAPI](https://fastapi.tiangolo.com/)
- [MDN: Fetch API](https://developer.mozilla.org/es/docs/Web/API/Fetch_API)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📝 Notas Importantes

1. **CORS**: El backend debe tener configurado CORS para permitir peticiones desde el frontend (ya está configurado en `backend/main.py`).

2. **Cookies**: Las cookies se envían automáticamente gracias a `credentials: "include"` en `apiFetch`.

3. **Variables de Entorno**: Nunca commitees archivos `.env.local` con información sensible.

4. **Validación**: Siempre valida los datos tanto en el frontend como en el backend.

---

## 🎯 Siguiente Paso

Ahora que entiendes cómo funciona la conexión, puedes:

1. Crear más funciones de servicio para otros endpoints
2. Implementar formularios para crear/editar recursos
3. Agregar validaciones más robustas
4. Implementar paginación para listas grandes
5. Agregar filtros y búsqueda

¡Buena suerte con tu desarrollo! 🚀
