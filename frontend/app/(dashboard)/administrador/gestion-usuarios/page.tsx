import { Separator } from "@/components/ui/separator";
import SearchOperarios from "./searchOperarios";

export default function digitar() {
    return(
        <div className="h-full w-full flex flex-col overflow-hidden md:overflow-hidden overflow-y-auto md:overflow-y-hidden animate-fade-in">
            <div className="w-full flex-shrink-0 animate-fade-in-down">
                <h1 className="text-lg md:text-xl font-bold p-3 md:p-4">Gestión de Usuarios</h1>
                <Separator />
            </div>
            
            {/* Contenedor de StatsPanel */}
            <div className="w-full flex-1 min-h-0 flex gap-3 md:gap-6 p-3 md:p-6 animate-fade-in-up overflow-y-auto md:overflow-hidden" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                <SearchOperarios/>
            </div>
      </div>
    );
}