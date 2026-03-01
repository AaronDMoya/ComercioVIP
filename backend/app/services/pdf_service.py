"""
Generación de PDF con ReportLab (puro Python, sin dependencias del sistema).
"""
import io
import logging
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.core.config import FRONTEND_URL

logger = logging.getLogger(__name__)

# Márgenes y diseño A4 (1 pt ≈ 0.35 mm)
MARGIN = 50
QR_SIZE_PT = 320  # puntos (~113 mm)


def _qr_png_bytes(url: str, size: int = 400) -> bytes:
    """Genera un QR con la URL y devuelve los bytes PNG."""
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _draw_wrapped(c: canvas.Canvas, x: float, y: float, text: str, max_width: int, font_name: str = "Helvetica", font_size: int = 10):
    """Dibuja texto con salto de línea por ancho máximo. Retorna la Y final."""
    from reportlab.lib.utils import simpleSplit
    c.setFont(font_name, font_size)
    lines = simpleSplit(text, font_name, font_size, max_width)
    for line in lines:
        c.drawString(x, y, line)
        y -= font_size * 1.2
    return y


def generar_pdf_qr_ingreso(asamblea_id: str, asamblea_title: str) -> bytes:
    """
    Genera un PDF A4 con ReportLab: buen padding, QR grande, sin librerías del sistema.
    """
    url_ingreso = f"{FRONTEND_URL}/update-users/ingreso?asamblea={asamblea_id}"
    qr_bytes = _qr_png_bytes(url_ingreso)
    fecha_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    codigo_str = asamblea_id[:8] if len(asamblea_id) >= 8 else asamblea_id
    title = asamblea_title or "Asamblea"

    w, h = A4
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("QR Ingreso - Registros Votación")

    y = h - MARGIN

    # Título
    c.setFont("Helvetica-Bold", 20)
    c.drawString(MARGIN, y, "Registros Votación")
    y -= 22
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN, y, "Ingreso para actualización de datos")
    y -= 14
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(MARGIN, y, f"Fecha de generación: {fecha_str}  ·  Código documento: {codigo_str}")
    c.setFillColorRGB(0, 0, 0)
    y -= 28

    # Línea
    c.setLineWidth(0.5)
    c.line(MARGIN, y, w - MARGIN, y)
    y -= 22

    # Asamblea
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN, y, "Asamblea")
    y -= 16
    c.setFont("Helvetica", 11)
    y = _draw_wrapped(c, MARGIN, y, title, int(w - 2 * MARGIN), "Helvetica", 11)
    y -= 6
    c.setFont("Helvetica", 10)
    c.drawString(MARGIN, y, "Propósito: actualización de datos para votación.")
    y -= 24

    # Instrucciones
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN, y, "Instrucciones")
    y -= 16
    c.setFont("Helvetica", 10)
    for i, line in enumerate([
        "Escanee el código QR con la cámara de su celular.",
        "Ingrese su número de torre y apartamento.",
        "Actualice sus datos personales en el formulario.",
    ], 1):
        c.drawString(MARGIN + 14, y, f"{i}. {line}")
        y -= 16
    y -= 20

    # QR (centrado, grande)
    qr_reader = ImageReader(io.BytesIO(qr_bytes))
    qr_x = (w - QR_SIZE_PT) / 2
    qr_y = y - QR_SIZE_PT
    c.drawImage(qr_reader, qr_x, qr_y, width=QR_SIZE_PT, height=QR_SIZE_PT)
    y = qr_y - 20

    # Etiqueta y URL
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(w / 2, y, "Código QR de acceso")
    y -= 14
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    y = _draw_wrapped(c, MARGIN, y, url_ingreso, int(w - 2 * MARGIN), "Helvetica", 9)
    c.setFillColorRGB(0, 0, 0)
    y -= 28

    # Pie
    c.setLineWidth(0.5)
    c.line(MARGIN, y, w - MARGIN, y)
    y -= 14
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.55, 0.55, 0.55)
    c.drawCentredString(w / 2, y, "Documento generado automáticamente por Registros Votación. Válido para actualización de datos.")
    c.setFillColorRGB(0, 0, 0)

    c.save()
    return buf.getvalue()
