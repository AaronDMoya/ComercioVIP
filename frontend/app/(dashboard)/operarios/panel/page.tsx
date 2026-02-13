import { Separator } from "@/components/ui/separator";
import StatsPanel from "./statspanel";

export default function Panel() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden animate-fade-in">
      <div className="w-full flex-shrink-0 animate-fade-in-down">
        <h1 className="text-xl font-bold p-4">Panel de Control General</h1>
        <Separator />
      </div>
      
      {/* Contenedor de StatsPanel */}
      <div className="w-full flex-1 min-h-0 p-6 animate-fade-in-up overflow-hidden" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <StatsPanel />
        </div>
    </div>
  );
}
