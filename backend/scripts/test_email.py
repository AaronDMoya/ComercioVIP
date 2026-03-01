"""
Script para probar el envío de correo con SendGrid.
Ejecutar desde la raíz del backend: python scripts/test_email.py
"""
import os
import sys
from pathlib import Path

# Asegurar que el backend está en el path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))
os.chdir(backend_root)

# Cargar .env manualmente por si no se cargó
from dotenv import load_dotenv
load_dotenv(backend_root / ".env")

def main():
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content

    api_key = os.getenv("SENDGRID_KEY")
    from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@comerciovip.com")
    from_name = os.getenv("SENDGRID_FROM_NAME", "Registros Votación")
    to_email = "demoyaaaron@gmail.com"

    print("Configuración:")
    print("  SENDGRID_KEY:", "OK (presente)" if api_key else "FALTA")
    print("  FROM:", from_email, f"({from_name})")
    print("  TO:", to_email)
    print()

    if not api_key:
        print("ERROR: Define SENDGRID_KEY en el archivo .env")
        sys.exit(1)

    from_email_obj = Email(from_email, from_name)
    to_obj = To(to_email)
    subject = "Prueba de envío - Registros Votación"
    plain = Content("text/plain", "Correo de prueba. Si recibiste esto, SendGrid funciona.")
    message = Mail(from_email_obj, to_obj, subject, plain)
    message.add_content(Content("text/html", "<p>Correo de <strong>prueba</strong> - Registros Votación.</p>"))

    try:
        sg = SendGridAPIClient(api_key=api_key)
        response = sg.send(message)
        print("Respuesta SendGrid:")
        print("  Status:", response.status_code)
        print("  Headers:", dict(response.headers))
        if response.body:
            print("  Body:", response.body.decode("utf-8") if isinstance(response.body, bytes) else response.body)
        if 200 <= response.status_code < 300:
            print("\nOK: Correo enviado. Revisa la bandeja de", to_email, "(y carpeta spam).")
        else:
            print("\nERROR: SendGrid devolvió un status no exitoso.")
            sys.exit(1)
    except Exception as e:
        print("EXCEPCIÓN al enviar:")
        print(type(e).__name__, str(e))
        if hasattr(e, "body") and e.body:
            print("Body:", e.body)
        if hasattr(e, "status_code"):
            print("Status code:", e.status_code)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
