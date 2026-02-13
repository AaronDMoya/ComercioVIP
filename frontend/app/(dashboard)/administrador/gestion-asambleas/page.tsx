import { Separator } from "@/components/ui/separator";
import SearchAsambleas from "./searchAsambleas";

export default function digitar() {
    return(
        <div className="min-h-screen w-full flex flex-col animate-fade-in">
            <div className="w-full animate-fade-in-down">
                <h1 className="text-xl font-bold p-4">Gestión de Asambleas</h1>
                <Separator />
            </div>
            
            {/* Contenedor de StatsPanel */}
            <div className="w-full h-full flex-1 flex gap-6 p-6 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                <SearchAsambleas/>
            </div>
      </div>
    );
}