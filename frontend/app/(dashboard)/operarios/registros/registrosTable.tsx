"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRegistros, actualizarRegistro, type Registro } from "@/lib/services/registroService";
import { toast } from "sonner";
import { useAsamblea } from "@/context/AsambleaContext";
import { Pencil, Check, X, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type EditableField = "cedula" | "nombre" | "telefono" | "correo" | "numero_torre" | "numero_apartamento" | "numero_control";
type SortField = "cedula" | "nombre" | "numero_torre" | "numero_apartamento" | "numero_control" | "coeficiente";

const EDIT_FIELDS: EditableField[] = ["cedula", "nombre", "telefono", "correo", "numero_torre", "numero_apartamento", "numero_control"];

function getDraftFromRegistro(registro: Registro): Record<EditableField, string> {
  return {
    cedula: registro.cedula ?? "",
    nombre: registro.nombre ?? "",
    telefono: registro.telefono ?? "",
    correo: registro.correo ?? "",
    numero_torre: registro.numero_torre ?? "",
    numero_apartamento: registro.numero_apartamento ?? "",
    numero_control: registro.numero_control ?? "",
  };
}

export default function RegistrosTable() {
  const { asambleaSeleccionada } = useAsamblea();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<EditableField, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterControl, setFilterControl] = useState<"all" | "with" | "without">("all");
  const [sort, setSort] = useState<{ field: SortField; direction: "asc" | "desc" } | null>(null);

  // Cargar registros
  useEffect(() => {
    const loadRegistros = async () => {
      if (!asambleaSeleccionada?.id) {
        setIsLoading(false);
        setRegistros([]);
        return;
      }

      setIsLoading(true);
      try {
        console.log("Cargando registros para asamblea:", asambleaSeleccionada.id);
        const data = await getRegistros(asambleaSeleccionada.id);
        console.log("Registros cargados:", data.length);
        setRegistros(data);
      } catch (error) {
        console.error("Error al cargar registros:", error);
        toast.error("Error al cargar los registros");
        setRegistros([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRegistros();
  }, [asambleaSeleccionada?.id]);

  // Actualizar primer poder (poder_1) con torre, apartamento, numero_control del registro
  const mergePoder1 = useCallback(
    (gestionPoderes: Record<string, any> | null, torre: string | null, apartamento: string | null, numeroControl: string | null): Record<string, any> => {
      const base = gestionPoderes && typeof gestionPoderes === "object" && !Array.isArray(gestionPoderes)
        ? { ...gestionPoderes }
        : {};
      const p1 = base.poder_1 && typeof base.poder_1 === "object" ? { ...base.poder_1 } : { torre: "", apartamento: "", numero_control: "" };
      base.poder_1 = {
        torre: torre ?? p1.torre ?? "",
        apartamento: apartamento ?? p1.apartamento ?? "",
        numero_control: numeroControl ?? p1.numero_control ?? "",
      };
      return base;
    },
    []
  );

  const handleStartEditTable = useCallback(() => {
    setDrafts(Object.fromEntries(registros.map((r) => [r.id, getDraftFromRegistro(r)])));
    setIsTableEditing(true);
  }, [registros]);

  const handleCancelEdit = useCallback(() => {
    setIsTableEditing(false);
    setDrafts({});
  }, []);

  const handleDraftChange = useCallback((registroId: string, field: EditableField, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [registroId]: { ...(prev[registroId] ?? {}), [field]: value } as Record<EditableField, string>,
    }));
  }, []);

  const getDraftForRow = useCallback(
    (registro: Registro): Record<EditableField, string> => ({
      ...getDraftFromRegistro(registro),
      ...drafts[registro.id],
    }),
    [drafts]
  );

  const draftEqualsRegistro = useCallback(
    (draft: Record<EditableField, string>, registro: Registro): boolean => {
      const current = getDraftFromRegistro(registro);
      return EDIT_FIELDS.every((f) => (draft[f] ?? "").trim() === (current[f] ?? "").trim());
    },
    []
  );

  const handleSaveAll = useCallback(
    async () => {
      const toUpdate = registros.filter((r) => {
        const draft = getDraftForRow(r);
        return !draftEqualsRegistro(draft, r);
      });
      if (toUpdate.length === 0) {
        toast.info("No hay cambios para guardar");
        setIsTableEditing(false);
        setDrafts({});
        return;
      }
      setIsSaving(true);
      try {
        const results = await Promise.all(
          toUpdate.map(async (registro) => {
            const draft = getDraftForRow(registro);
            const payload: Record<string, unknown> = {};
            EDIT_FIELDS.forEach((f) => {
              const v = (draft[f] ?? "").trim();
              payload[f] = v || null;
            });
            const newTorre = (payload.numero_torre as string | null) ?? null;
            const newApt = (payload.numero_apartamento as string | null) ?? null;
            const newControl = (payload.numero_control as string | null) ?? null;
            payload.gestion_poderes = mergePoder1(registro.gestion_poderes, newTorre, newApt, newControl);
            return actualizarRegistro(registro.id, payload as any);
          })
        );
        setRegistros((prev) =>
          prev.map((r) => {
            const updated = results.find((u) => u.id === r.id);
            return updated ?? r;
          })
        );
        setIsTableEditing(false);
        setDrafts({});
        toast.success(
          toUpdate.length === 1 ? "Registro actualizado" : `${toUpdate.length} registros actualizados`
        );
      } catch (err) {
        console.error(err);
        toast.error("Error al actualizar los registros");
      } finally {
        setIsSaving(false);
      }
    },
    [registros, getDraftForRow, draftEqualsRegistro, mergePoder1]
  );

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => {
      if (prev?.field === field) {
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: "asc" };
    });
  }, []);

  const filteredRegistros = useMemo(() => {
    let data = [...registros];

    const query = searchTerm.trim().toLowerCase();
    if (query) {
      data = data.filter((r) => {
        const cedula = r.cedula?.toLowerCase() ?? "";
        const nombre = r.nombre?.toLowerCase() ?? "";
        const telefono = r.telefono?.toLowerCase() ?? "";
        const correo = r.correo?.toLowerCase() ?? "";
        const torre = r.numero_torre?.toLowerCase() ?? "";
        const apt = r.numero_apartamento?.toLowerCase() ?? "";
        const control = r.numero_control?.toLowerCase() ?? "";
        return (
          cedula.includes(query) ||
          nombre.includes(query) ||
          telefono.includes(query) ||
          correo.includes(query) ||
          torre.includes(query) ||
          apt.includes(query) ||
          control.includes(query)
        );
      });
    }

    if (filterControl === "with") {
      data = data.filter((r) => r.numero_control && r.numero_control.trim() !== "");
    } else if (filterControl === "without") {
      data = data.filter((r) => !r.numero_control || r.numero_control.trim() === "");
    }

    if (sort) {
      const { field: sortField, direction: sortDirection } = sort;
      data.sort((a, b) => {
        if (sortField === "coeficiente") {
          const av = a.coeficiente ?? 0;
          const bv = b.coeficiente ?? 0;
          if (av < bv) return sortDirection === "asc" ? -1 : 1;
          if (av > bv) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }
        const av = (a[sortField] ?? "").toString().toLowerCase();
        const bv = (b[sortField] ?? "").toString().toLowerCase();
        if (av < bv) return sortDirection === "asc" ? -1 : 1;
        if (av > bv) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [registros, searchTerm, filterControl, sort]);

  // Función para obtener el número de actividades (actividad_ingreso) y formatear la información
  // Estructura: { actividad_1: { tipo, hora }, actividad_2: { tipo, hora }, ... }
  const getActividadesInfo = (actividadIngreso: Record<string, any> | null) => {
    if (!actividadIngreso || typeof actividadIngreso !== "object") {
      return { count: 0, details: [] as { index: number; tipo: string; hora: string }[] };
    }
    const keys = Object.keys(actividadIngreso).filter((key) => key.startsWith("actividad_"));
    keys.sort((a, b) => {
      const numA = parseInt(a.replace("actividad_", ""), 10) || 0;
      const numB = parseInt(b.replace("actividad_", ""), 10) || 0;
      return numA - numB;
    });
    const details = keys.map((key, i) => {
      const act = actividadIngreso[key];
      return {
        index: i + 1,
        tipo: act?.tipo ?? "-",
        hora: act?.hora ?? "-",
      };
    });
    return { count: details.length, details };
  };

  // Función para obtener el número de poderes y formatear la información
  // Maneja el nuevo formato anidado: {"poder_1": {...}, "poder_2": {...}, ...}
  const getPoderesInfo = (gestionPoderes: Record<string, any> | any[] | null) => {
    if (!gestionPoderes) {
      return { count: 0, details: [] };
    }

    // Si gestion_poderes es un array
    if (Array.isArray(gestionPoderes)) {
      return {
        count: gestionPoderes.length,
        details: gestionPoderes.map((poder, index) => ({
          index: index + 1,
          torre: poder.torre || poder.numero_torre || "-",
          apartamento: poder.apartamento || poder.numero_apartamento || "-",
          numero_control: poder.numero_control || "-",
        })),
      };
    }

    // Si gestion_poderes es un objeto
    const keys = Object.keys(gestionPoderes);
    
    // Verificar si tiene formato nuevo anidado (poder_1, poder_2, etc.)
    const poderKeys = keys.filter(key => key.startsWith('poder_'));
    if (poderKeys.length > 0) {
      // Ordenar las claves numéricamente (poder_1, poder_2, etc.)
      poderKeys.sort((a, b) => {
        const numA = parseInt(a.replace('poder_', '')) || 0;
        const numB = parseInt(b.replace('poder_', '')) || 0;
        return numA - numB;
      });
      
      const details = poderKeys.map((key, index) => {
        const poder = gestionPoderes[key];
        return {
          index: index + 1,
          torre: poder?.torre || poder?.numero_torre || "-",
          apartamento: poder?.apartamento || poder?.numero_apartamento || "-",
          numero_control: poder?.numero_control || "-",
        };
      });
      
      return {
        count: poderKeys.length,
        details: details,
      };
    }

    // Compatibilidad con formato antiguo (plano)
    // Verificar si tiene las propiedades directamente
    if (gestionPoderes.torre || gestionPoderes.apartamento || gestionPoderes.numero_control) {
      return {
        count: 1,
        details: [
          {
            index: 1,
            torre: gestionPoderes.torre || gestionPoderes.numero_torre || "-",
            apartamento: gestionPoderes.apartamento || gestionPoderes.numero_apartamento || "-",
            numero_control: gestionPoderes.numero_control || "-",
          },
        ],
      };
    }

    // Si no tiene estructura conocida, retornar vacío
    return {
      count: 0,
      details: [],
    };
  };

  const SKELETON_ROWS = 8;
  const columnCount = 11; // #, Cédula, Nombre, Teléfono, Correo, N° Torre, N° Apt, N° Control, Coeficiente, Actividad, Poderes

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-3">
      <div className="flex-shrink-0 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <InputGroup>
              <InputGroupInput
                placeholder="Buscar por cédula, nombre, correo, torre, apt o N° control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs md:text-sm"
              />
              <InputGroupAddon>
                <Search className="h-4 w-4 text-gray-500" />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select
              value={filterControl}
              onValueChange={(value) => setFilterControl(value as "all" | "with" | "without")}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs md:text-sm">
                <SelectValue placeholder="Filtrar por control" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filtro N° Control</SelectLabel>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Con N° Control</SelectItem>
                  <SelectItem value="without">Sin N° Control</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 md:mt-0">
          {!isTableEditing ? (
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-colors font-medium"
              onClick={handleStartEditTable}
              disabled={registros.length === 0}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="default"
                className="gap-1.5"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Guardando…" : "Actualizar cambios"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table className="w-full min-w-[1000px]">
        <TableHeader>
          <TableRow className="h-10 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 hover:bg-gray-100/50">
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 text-center">#</TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("cedula")}
            >
              <span className="inline-flex items-center gap-1.5">
                Cédula
                {sort?.field === "cedula" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider max-w-[200px] cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("nombre")}
            >
              <span className="inline-flex items-center gap-1.5">
                Nombre
                {sort?.field === "nombre" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Teléfono</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[140px]">Correo</TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("numero_torre")}
            >
              <span className="inline-flex items-center gap-1.5">
                N° Torre
                {sort?.field === "numero_torre" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("numero_apartamento")}
            >
              <span className="inline-flex items-center gap-1.5">
                N° Apt
                {sort?.field === "numero_apartamento" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("numero_control")}
            >
              <span className="inline-flex items-center gap-1.5">
                N° Control
                {sort?.field === "numero_control" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead
              className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/70"
              onClick={() => handleSort("coeficiente")}
            >
              <span className="inline-flex items-center gap-1.5">
                Coeficiente
                {sort?.field === "coeficiente" ? (
                  sort.direction === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-gray-600" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-gray-600" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            </TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actividad</TableHead>
            <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Poderes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(SKELETON_ROWS)].map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="border-b border-gray-100">
                {[...Array(columnCount)].map((_, j) => (
                  <TableCell key={j} className="py-2.5 px-4">
                    <Skeleton className="h-8 w-full min-w-[60px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredRegistros.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-12 text-center text-gray-500 text-sm"
              >
                {registros.length === 0 && !asambleaSeleccionada?.id
                  ? "Seleccione una asamblea para ver los registros."
                  : "No se encontraron registros para esta asamblea."}
              </TableCell>
            </TableRow>
          ) : (
          filteredRegistros.map((registro, index) => (
            <TableRow
              key={registro.id}
              className="h-auto border-b border-gray-100 transition-colors duration-150 hover:bg-blue-50/50 hover:shadow-sm animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
            >
              <TableCell className="py-2.5 px-4 text-xs text-center text-gray-500 font-medium bg-gray-50/30">{index + 1}</TableCell>
              <TableCell className="py-1.5 px-4 text-xs font-semibold text-gray-900 min-w-[100px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    value={getDraftForRow(registro).cedula}
                    onChange={(e) => handleDraftChange(registro.id, "cedula", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block">{registro.cedula}</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-800 max-w-[200px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs max-w-full"
                    value={getDraftForRow(registro).nombre}
                    onChange={(e) => handleDraftChange(registro.id, "nombre", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate cursor-help">{registro.nombre}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{registro.nombre}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-600 min-w-[90px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    value={getDraftForRow(registro).telefono}
                    onChange={(e) => handleDraftChange(registro.id, "telefono", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block">{registro.telefono ?? <span className="text-gray-400">-</span>}</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-600 min-w-[140px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    type="email"
                    value={getDraftForRow(registro).correo}
                    onChange={(e) => handleDraftChange(registro.id, "correo", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block truncate" title={registro.correo ?? undefined}>
                    {registro.correo ?? <span className="text-gray-400">-</span>}
                  </span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-600 min-w-[80px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    value={getDraftForRow(registro).numero_torre}
                    onChange={(e) => handleDraftChange(registro.id, "numero_torre", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block">{registro.numero_torre ?? <span className="text-gray-400">-</span>}</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-600 min-w-[80px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    value={getDraftForRow(registro).numero_apartamento}
                    onChange={(e) => handleDraftChange(registro.id, "numero_apartamento", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block">{registro.numero_apartamento ?? <span className="text-gray-400">-</span>}</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-4 text-xs text-gray-600 min-w-[90px]">
                {isTableEditing ? (
                  <Input
                    className="h-8 text-xs"
                    value={getDraftForRow(registro).numero_control}
                    onChange={(e) => handleDraftChange(registro.id, "numero_control", e.target.value)}
                    disabled={isSaving}
                  />
                ) : (
                  <span className="block">{registro.numero_control ?? <span className="text-gray-400">-</span>}</span>
                )}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-xs">
                {registro.coeficiente !== null ? (
                  <span className="font-medium text-blue-600">{registro.coeficiente.toFixed(4)}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-2.5 px-4">
                {(() => {
                  const actividadesInfo = getActividadesInfo(registro.actividad_ingreso);
                  if (actividadesInfo.count === 0) {
                    return (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200">
                        Sin actividades
                      </span>
                    );
                  }
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-help bg-emerald-50 hover:bg-emerald-100 transition-colors duration-150 border border-emerald-200">
                          {actividadesInfo.count} {actividadesInfo.count === 1 ? "actividad" : "actividades"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm bg-gray-900 text-white border-gray-700">
                        <div className="space-y-2">
                          <div className="font-semibold mb-2 text-white">Actividad de ingreso:</div>
                          {actividadesInfo.details.map((act) => (
                            <div key={act.index} className="text-xs space-y-1 border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                              <div>
                                <span className="font-medium text-emerald-300">Actividad {act.index}:</span>{" "}
                                <span className="text-white capitalize">{act.tipo}</span>
                                {act.hora !== "-" && (
                                  <span className="text-gray-300"> — {act.hora}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </TableCell>
              <TableCell className="py-2.5 px-4">
                {(() => {
                  const poderesInfo = getPoderesInfo(registro.gestion_poderes);
                  if (poderesInfo.count === 0) {
                    return <span className="text-xs text-gray-400">-</span>;
                  }
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:text-blue-700 cursor-help bg-blue-50 hover:bg-blue-100 transition-colors duration-150 border border-blue-200">
                          {poderesInfo.count} {poderesInfo.count === 1 ? "poder" : "poderes"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm bg-gray-900 text-white border-gray-700">
                        <div className="space-y-2">
                          <div className="font-semibold mb-2 text-white">Gestión de Poderes:</div>
                          {poderesInfo.details.map((poder) => (
                            <div key={poder.index} className="text-xs space-y-1 border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                              <div><span className="font-medium text-blue-300">Poder {poder.index}:</span></div>
                              <div className="pl-2 space-y-0.5 text-gray-300">
                                <div>Torre: <span className="text-white">{poder.torre}</span></div>
                                <div>Apartamento: <span className="text-white">{poder.apartamento}</span></div>
                                <div>Número Control: <span className="text-white">{poder.numero_control}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
