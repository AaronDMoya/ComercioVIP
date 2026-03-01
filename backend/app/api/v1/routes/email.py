"""
Ruta de prueba para envío de correo electrónico con SendGrid.
"""
from fastapi import APIRouter, HTTPException

from app.services.email_service import send_test_email

router = APIRouter(prefix="/email", tags=["email"])


@router.post("/test")
def test_send_email():
    """
    Envía un correo de prueba a demoyaaaron@gmail.com.
    Útil para verificar que SendGrid está configurado correctamente.
    """
    to_email = "demoyaaaron@gmail.com"
    ok = send_test_email(to_email)
    if not ok:
        raise HTTPException(
            status_code=502,
            detail="No se pudo enviar el correo de prueba. Revisa SENDGRID_KEY y el remitente verificado en SendGrid.",
        )
    return {"ok": True, "message": "Correo de prueba enviado a " + to_email}
