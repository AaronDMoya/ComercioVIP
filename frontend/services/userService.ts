import { apiFetch } from "@/lib/api";
import type { UserCreate, UserResponse } from "@/types/user";

export interface CreateUserResult {
    success: boolean;
    data?: UserResponse;
    error?: string;
}

