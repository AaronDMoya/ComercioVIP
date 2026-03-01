# Servicio de correo con SendGrid
import base64
import io
import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Email,
    To,
    Content,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
    ContentId,
)
from app.core.config import SENDGRID_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
from app.email.template_loader import render_reporte_control, render_actualizacion_datos

logger = logging.getLogger(__name__)


def _qr_to_base64(url: str, size: int = 160) -> str:
    """Genera un QR con la URL y lo devuelve en base64 PNG."""
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.warning("No se pudo generar QR: %s", e)
        return ""


def send_email(
    to_email: str,
    subject: str,
    plain_content: str,
    html_content: Optional[str] = None,
    inline_attachments: Optional[list] = None,
) -> bool:
    """Envía un correo. inline_attachments: lista de dict con content_base64, content_id, filename, mime_type."""
    if not SENDGRID_KEY:
        logger.error("SENDGRID_KEY no configurada")
        return False
    from_email = Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME)
    to = To(to_email)
    content = Content("text/plain", plain_content)
    mail = Mail(from_email, to, subject, content)
    if html_content:
        mail.add_content(Content("text/html", html_content))
    if inline_attachments:
        attachments = [_make_inline_attachment(att) for att in inline_attachments]
        mail.attachment = attachments[0] if len(attachments) == 1 else attachments
    try:
        sg = SendGridAPIClient(api_key=SENDGRID_KEY)
        response = sg.send(mail)
        if 200 <= response.status_code < 300:
            logger.info("Correo enviado a %s", to_email)
            return True
        logger.warning("SendGrid status %s", response.status_code)
        return False
    except Exception as e:
        logger.exception("Error SendGrid: %s", e)
        return False


def _make_inline_attachment(att: dict) -> Attachment:
    a = Attachment()
    a.file_content = FileContent(att["content_base64"])
    a.file_type = FileType(att.get("mime_type", "image/png"))
    a.file_name = FileName(att.get("filename", "image.png"))
    a.disposition = Disposition("inline")
    a.content_id = ContentId(att["content_id"])
    return a


def send_test_email(to_email: str) -> bool:
    subject = "Prueba de envío - Registros Votación"
    plain = "Correo de prueba del sistema Registros Votación. Si recibiste esto, SendGrid funciona."
    html = "<p>Correo de <strong>prueba</strong> - Registros Votación. Si recibiste esto, SendGrid funciona.</p>"
    return send_email(to_email, subject, plain, html)


def send_reporte_control(
    to_email: str,
    nombre: str,
    numero_control: str,
    asamblea_title: str,
) -> bool:
    """
    Envía el correo de aviso de devolución de control (o multa).
    Usa la plantilla HTML reporte_control.
    """
    subject = "Aviso: devolución de control - Registros Votación"
    plain = (
        f"Estimado/a {nombre},\n\n"
        f"En el marco de la asamblea «{asamblea_title}» se le asignó el N° de Control {numero_control}. "
        "Debe devolver el control en las condiciones y plazos establecidos. "
        "El incumplimiento puede acarrear la aplicación de una multa según la normativa vigente.\n\n"
        "Atentamente, Registros Votación"
    )
    html = render_reporte_control(
        nombre=nombre,
        asamblea_title=asamblea_title,
        numero_control=numero_control,
    )
    return send_email(to_email, subject, plain, html)


def send_aviso_actualizacion(
    to_email: str,
    nombre: str,
    asamblea_title: str,
    url_actualizar: str,
) -> bool:
    """
    Envía el correo para que el usuario actualice sus datos, con link y QR.
    El QR se envía como adjunto inline (cid:qr_actualizar) para que se muestre en el cliente de correo.
    """
    subject = "Actualice sus datos - Registros Votación"
    plain = (
        f"Estimado/a {nombre},\n\n"
        f"En el marco de la asamblea «{asamblea_title}» puede actualizar sus datos personales "
        f"(cédula, nombre, teléfono y correo) en el siguiente enlace:\n\n"
        f"{url_actualizar}\n\n"
        "Atentamente, Registros Votación"
    )
    qr_base64 = _qr_to_base64(url_actualizar)
    html = render_actualizacion_datos(
        nombre=nombre,
        asamblea_title=asamblea_title,
        url_actualizar=url_actualizar,
    )
    inline_attachments = (
        [
            {
                "content_base64": qr_base64,
                "content_id": "qr_actualizar",
                "filename": "qr_actualizar.png",
                "mime_type": "image/png",
            }
        ]
        if qr_base64
        else None
    )
    return send_email(to_email, subject, plain, html, inline_attachments=inline_attachments)
