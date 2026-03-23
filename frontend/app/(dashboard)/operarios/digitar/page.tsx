"use client";

import { Separator } from "@/components/ui/separator";
import { RegistroProvider } from "@/context/RegistroContext";
import SearchPerson from "./searchPerson";
import DataPerson from "./dataPerson";

export default function digitar() {
    return(
        <RegistroProvider>
            <div className="h-full w-full flex flex-col animate-fade-in min-h-0 overflow-y-auto lg:overflow-hidden">
                <div className="flex-shrink-0 w-full animate-fade-in-down">
                    <h1 className="text-lg md:text-xl font-bold p-3 md:p-4">Panel de Control General</h1>
                    <Separator />
                </div>
                
                {/* Móvil: scroll en esta zona; desktop: altura fija sin cortar DataPerson */}
                <div className="w-full flex-1 flex flex-col lg:flex-row gap-3 md:gap-6 p-3 md:p-6 min-h-0 lg:min-h-0 lg:overflow-hidden overflow-y-visible lg:overflow-y-hidden">
                    <div className="animate-slide-in-left h-auto lg:h-full lg:max-w-md lg:flex-shrink-0 min-h-0 flex-shrink-0" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                        <SearchPerson/>
                    </div>
                    <div className="animate-slide-in-right w-full lg:flex-1 lg:min-h-0 lg:h-full max-lg:flex-none min-h-0" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
                        <DataPerson/>
                    </div>
                </div>
          </div>
        </RegistroProvider>
    );
}