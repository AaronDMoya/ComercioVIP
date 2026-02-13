"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { FileSpreadsheet, ChevronRight, ChevronLeft, Check, Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api"
import * as XLSX from "xlsx";

interface CreateAsambleaDialogProps {
  trigger?: React.ReactNode;
  onAsambleaCreated?: () => void;
}

type Step = 1 | 2 | 3;

interface ExcelData {
  headers: string[];
  rows: (string | number)[][];
}

export function CreateAsambleaDialog({ trigger, onAsambleaCreated }: CreateAsambleaDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    estado: "inactiva" as "activa" | "inactiva",
  });

  // Estado para el archivo Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      estado: "inactiva",
    });
    setExcelFile(null);
    setExcelData(null);
    setExcelFileName("");
    setCurrentStep(1);
  };

  // Función para manejar la carga del archivo Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    const validExtensions = [".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Por favor, selecciona un archivo Excel (.xlsx o .xls)");
      return;
    }

    setExcelFile(file);
    setExcelFileName(file.name);
    setIsLoadingExcel(true);
    setExcelData(null); // Limpiar datos anteriores

    // Leer el archivo Excel
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];
        
        if (jsonData.length === 0) {
          toast.error("El archivo Excel está vacío");
          setIsLoadingExcel(false);
          return;
        }

        // Primera fila como headers
        const headers = (jsonData[0] || []).map(String);
        // Filtrar filas vacías pero mantener al menos una fila vacía si no hay datos
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined));
        
        // Si no hay filas después de filtrar, crear una fila vacía para que el usuario pueda agregar datos
        const finalRows = rows.length > 0 ? rows : [new Array(headers.length).fill("")];

        // Simular un pequeño delay para la animación
        setTimeout(() => {
          setExcelData({
            headers,
            rows: finalRows,
          });
          setIsLoadingExcel(false);
        }, 300);
      } catch (error) {
        console.error("Error al leer el archivo Excel:", error);
        toast.error("Error al leer el archivo Excel. Por favor, verifica que el archivo sea válido.");
        setIsLoadingExcel(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Función para editar una celda del Excel
  const handleCellEdit = (rowIndex: number, colIndex: number, value: string | number) => {
    if (!excelData) return;

    const newRows = [...excelData.rows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = [];
    }
    newRows[rowIndex][colIndex] = value;

    setExcelData({
      ...excelData,
      rows: newRows,
    });
  };

  // Función para eliminar una fila
  const handleDeleteRow = (rowIndex: number) => {
    if (!excelData) return;

    const newRows = excelData.rows.filter((_, index) => index !== rowIndex);
    setExcelData({
      ...excelData,
      rows: newRows,
    });
  };

  // Función para agregar una nueva fila
  const handleAddRow = () => {
    if (!excelData) return;

    const newRow = new Array(excelData.headers.length).fill("");
    setExcelData({
      ...excelData,
      rows: [...excelData.rows, newRow],
    });
  };

  // Función para eliminar el archivo
  const handleRemoveFile = () => {
    setExcelFile(null);
    setExcelData(null);
    setExcelFileName("");
    setIsLoadingExcel(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Función para validar el paso actual
  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return formData.titulo.trim().length > 0; // Solo requiere título, descripción es opcional
      case 2:
        // Solo requiere que haya un archivo cargado y datos procesados (aunque no tenga filas)
        return excelData !== null && excelData.headers.length > 0;
      case 3:
        return true; // El paso 3 es opcional
      default:
        return false;
    }
  };

  // Función para avanzar al siguiente paso
  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!validateStep(currentStep)) {
      toast.error("Por favor, completa todos los campos requeridos antes de continuar.");
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  // Función para retroceder al paso anterior
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // Función para mapear los datos del Excel a los registros
  const mapExcelDataToRegistros = (): any[] => {
    if (!excelData) return [];

    return excelData.rows.map((row) => {
      // Crear un objeto para mapear los valores por índice de columna
      const registro: any = {};
      
      // Mapear cada columna del header a su valor correspondiente
      excelData.headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();
        const value = row[index] || "";
        
        // Mapeo flexible de columnas
        if (headerLower.includes("cedula") || headerLower.includes("cédula") || headerLower.includes("documento")) {
          registro.cedula = String(value);
        } else if (headerLower.includes("nombre") && !headerLower.includes("torre") && !headerLower.includes("apartamento")) {
          registro.nombre = String(value);
        } else if (headerLower.includes("telefono") || headerLower.includes("teléfono") || headerLower.includes("celular")) {
          registro.telefono = String(value);
        } else if (headerLower.includes("torre")) {
          registro.numero_torre = String(value);
        } else if (headerLower.includes("apartamento") || headerLower.includes("apto")) {
          registro.numero_apartamento = String(value);
        } else if (headerLower.includes("control")) {
          registro.numero_control = String(value);
        } else if (headerLower.includes("coeficiente") || headerLower.includes("coef")) {
          registro.coeficiente = value ? parseFloat(String(value)) : null;
        }
      });

      return registro;
    }).filter(registro => registro.cedula && registro.nombre); // Filtrar registros sin cédula o nombre
  };

  // Función para manejar el submit final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      toast.error("Por favor, completa todos los pasos requeridos.");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Creando asamblea...");

    try {
      // Mapear los datos del Excel a registros
      const registros = mapExcelDataToRegistros();

      if (registros.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No se encontraron registros válidos en el archivo Excel. Asegúrate de tener al menos cédula y nombre.");
        setIsLoading(false);
        return;
      }

      // Preparar los datos para enviar
      const estado = formData.estado === "activa" ? "ACTIVA" : "CREADA";
      
      const asambleaData = {
        title: formData.titulo,
        description: formData.descripcion || null,
        estado: estado,
        registros: registros
      };

      // Enviar a la API
      const response = await apiFetch("/asambleas/create", {
        method: "POST",
        body: JSON.stringify(asambleaData),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        const asamblea = await response.json();
        toast.success(`Asamblea "${formData.titulo}" creada exitosamente`);
        
        // Resetear formulario y cerrar dialog
        resetForm();
        setIsDialogOpen(false);
        
        if (onAsambleaCreated) {
          onAsambleaCreated();
        }
      } else {
        // Manejar errores del servidor
        let errorMessage = "Error al crear la asamblea";
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          if (response.status === 400) {
            errorMessage = "Datos inválidos. Verifica la información ingresada.";
          } else if (response.status === 401) {
            errorMessage = "No tienes permisos para realizar esta acción.";
          } else if (response.status === 403) {
            errorMessage = "No tienes permisos para crear asambleas.";
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error al crear la asamblea:", error);
      toast.error("Error de conexión. Verifica que el servidor esté disponible.");
    } finally {
      setIsLoading(false);
    }
  };

  // Componente del Stepper
  const Stepper = () => {
    const steps = [
      { number: 1, label: "Información", completed: currentStep > 1 },
      { number: 2, label: "Archivo Excel", completed: currentStep > 2 },
      { number: 3, label: "Estado", completed: false },
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep === step.number
                    ? "bg-blue-600 text-white"
                    : step.completed
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.completed ? <Check className="w-5 h-5" /> : step.number}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  currentStep === step.number ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  step.completed ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center animate-fade-in-down">
            <DialogTitle className="text-2xl font-bold">
              Crear Nueva Asamblea
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Completa los siguientes pasos para crear una nueva asamblea.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Stepper />

        <form onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === 3) {
            handleSubmit(e);
          }
        }} className="flex flex-col gap-4 animate-fade-in-up">
          {/* Paso 1: Información de la Asamblea */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Título de la Asamblea *</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type="text"
                    placeholder="Ingresa el título de la asamblea"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <InputGroupAddon>
                    <FileSpreadsheet className="w-4 h-4" />
                  </InputGroupAddon>
                </InputGroup>
              </div>

              <div>
                <FieldLabel>Descripción</FieldLabel>
                <Textarea
                  placeholder="Ingresa la descripción de la asamblea (opcional)"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  disabled={isLoading}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Paso 2: Cargar Archivo Excel */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Archivo Excel *</FieldLabel>
                {!excelFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-file-input"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="excel-file-input"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="w-10 h-10 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Haz clic para cargar un archivo Excel
                      </span>
                      <span className="text-xs text-gray-400">
                        Formatos soportados: .xlsx, .xls
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">{excelFileName}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {isLoadingExcel ? (
                      <div className="border rounded-lg p-12 flex flex-col items-center justify-center gap-4 bg-gray-50 animate-fade-in">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm text-gray-600">Procesando archivo Excel...</p>
                      </div>
                    ) : excelData ? (
                      <div className="border rounded-lg overflow-hidden animate-fade-in-up">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                          <table className="w-full border-collapse min-w-full">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-200 w-16 animate-fade-in">
                                  #
                                </th>
                                {excelData.headers.map((header, index) => (
                                  <th
                                    key={index}
                                    className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700 min-w-[150px] animate-fade-in-up"
                                    style={{
                                      animationDelay: `${index * 0.05}s`,
                                      animationFillMode: 'both'
                                    }}
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {excelData.rows.map((row, rowIndex) => (
                                <tr 
                                  key={rowIndex} 
                                  className="hover:bg-gray-50 animate-fade-in-up"
                                  style={{
                                    animationDelay: `${(rowIndex * 0.03) + 0.2}s`,
                                    animationFillMode: 'both'
                                  }}
                                >
                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-600 bg-gray-50">
                                    {rowIndex + 1}
                                  </td>
                                  {excelData.headers.map((_, colIndex) => (
                                    <td
                                      key={colIndex}
                                      className="border border-gray-300 px-2 py-1"
                                    >
                                      <input
                                        type="text"
                                        value={row[colIndex] || ""}
                                        onChange={(e) =>
                                          handleCellEdit(rowIndex, colIndex, e.target.value)
                                        }
                                        className="w-full px-2 py-1 text-xs border-none outline-none focus:bg-blue-50"
                                        disabled={isLoading}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-2 bg-gray-50 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRow}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            + Agregar Fila
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Estado de la Asamblea */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Estado de la Asamblea</FieldLabel>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-gray-600">
                    {formData.estado === "activa" ? "Activa" : "Inactiva"}
                  </span>
                  <Switch
                    checked={formData.estado === "activa"}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, estado: checked ? "activa" : "inactiva" })
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-blue-700">Importante:</strong> Al marcar la asamblea como <strong>Activa</strong>, 
                    los operarios del sistema podrán acceder a ella y comenzar a trabajar con los datos. 
                    Si la dejas como <strong>Inactiva</strong>, la asamblea se creará pero permanecerá oculta para los operarios 
                    hasta que cambies su estado.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Puedes cambiar el estado de la asamblea en cualquier momento después de crearla.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <div className="flex gap-2 w-full sm:w-auto">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={(e) => handleNext(e)}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? "Creando..." : "Crear Asamblea"}
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
