from fastapi import APIRouter, Depends, Response, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.core.database import get_db
from app.schemas.user_schema import UserLogin, UserResponse
from app.services.user_service import login_user as login_user_service
from app.core.security import create_access_token
from app.core.auth import get_current_user
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["auth"])

# Endpoint para login de usuario
@router.post("/login")
def login(data_user: UserLogin, response: Response, db: Session = Depends(get_db)):
    try:
        user = login_user_service(db, data_user)
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during login: {str(e)}"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token(
        {
            "sub": str(user.id),
            "is_admin": user.is_admin,
        }, 
        int(ACCESS_TOKEN_EXPIRE_MINUTES) if ACCESS_TOKEN_EXPIRE_MINUTES else 30
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * (int(ACCESS_TOKEN_EXPIRE_MINUTES) if ACCESS_TOKEN_EXPIRE_MINUTES else 30)
    )

    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "last_name": user.last_name,
            "username": user.username,
            "is_admin": user.is_admin
        }
    }

# Endpoint para obtener el usuario actual
@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.repositories.user_repository import get_by_id
    from uuid import UUID
    
    try:
        user_id = UUID(current_user.get("sub"))
        user = get_by_id(db, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "sub": str(user.id),
            "is_admin": user.is_admin,
            "name": user.name,
            "last_name": user.last_name,
            "username": user.username
        }
    except OperationalError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again later."
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

# Endpoint para logout
@router.post("/logout")
def logout(response: Response = Response()):
    response.delete_cookie(key="access_token")
    return {"message": "Logout successful"}
