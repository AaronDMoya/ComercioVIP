from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.core.database import get_db
from app.schemas.user_schema import UserCreate, UserResponse, UserUpdate
from app.services.user_service import create_new_user, get_users, update_existing_user
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/users", tags=["users"])

# Endpoint para obtener todos los usuarios
@router.get("", response_model=dict)
def list_users(
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(100, ge=1, le=100, description="Número máximo de registros a retornar"),
    search: Optional[str] = Query(None, description="Búsqueda por nombre, apellido o username"),
    is_admin: Optional[bool] = Query(None, description="Filtrar por rol (true=admin, false=operario)"),
    db: Session = Depends(get_db)
):
    try:
        result = get_users(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            is_admin=is_admin
        )
        
        # Convertir los usuarios a UserResponse
        # Pydantic v2 usa model_validate con from_attributes=True en Config
        users_response = [UserResponse.model_validate(user) for user in result["users"]]
        
        return {
            "users": users_response,
            "total": result["total"]
        }
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching users: {str(e)}"
        )

# Endpoint para crear un usuario
@router.post("/create", response_model=UserResponse)
def create_user(data_user: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_new_user(db, data_user)
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating user: {str(e)}"
        )

# Endpoint para actualizar un usuario
@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, data_user: UserUpdate, db: Session = Depends(get_db)):
    try:
        updated_user = update_existing_user(db, user_id, data_user)
        return UserResponse.model_validate(updated_user)
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating user: {str(e)}"
        )