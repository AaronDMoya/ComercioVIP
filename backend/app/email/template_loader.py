"""
Cargador de plantillas de correo desde backend/app/email/templates/.
Las plantillas usan placeholders {nombre}, {asamblea_title}, etc.
"""
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def get_template_path(name: str) -> Path:
    """Ruta al archivo de plantilla por nombre (sin extensión)."""
    return _TEMPLATES_DIR / f"{name}.html"


def load_template(name: str) -> str:
    """Carga el contenido de una plantilla por nombre (sin extensión)."""
    path = get_template_path(name)
    if not path.exists():
        raise FileNotFoundError(f"Plantilla no encontrada: {path}")
    return path.read_text(encoding="utf-8")


def render_reporte_control(nombre: str, asamblea_title: str, numero_control: str) -> str:
    """Carga la plantilla reporte_control y reemplaza placeholders."""
    html = load_template("reporte_control")
    return html.format(
        nombre=nombre or "Estimado/a",
        asamblea_title=asamblea_title or "Asamblea",
        numero_control=numero_control or "—",
    )


def render_actualizacion_datos(
    nombre: str,
    asamblea_title: str,
    url_actualizar: str,
) -> str:
    """Carga la plantilla actualizacion_datos y reemplaza placeholders. El QR se envía como adjunto inline (cid:qr_actualizar)."""
    html = load_template("actualizacion_datos")
    return html.format(
        nombre=nombre or "Estimado/a",
        asamblea_title=asamblea_title or "Asamblea",
        url_actualizar=url_actualizar or "",
    )
