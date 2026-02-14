"use client";

import { Scale  } from "lucide-react"
import LoginForm from "./loginForm";

export default function LoginPage() {
    return(
        <div 
        className="
        min-h-screen w-full flex items-center justify-center bg-gray-200
        bg-[linear-gradient(rgba(255,255,255,0.18)_3px,transparent_3px),linear-gradient(90deg,rgba(255,255,255,0.18)_3px,transparent_3px)]
        bg-[size:60px_60px]"
        >
            <div
            className="absolute top-2 left-2 bg-white rounded-lg p-2 flex gap-2 animate-fade-in-down shadow-md hover:shadow-lg transition-smooth hover-lift"
            >
                <Scale 
                className="w-6 h-6 text-blue-600 transition-transform duration-300 hover:rotate-12"
                />
                <h1
                className="text-1xl font-semibold"
                >
                    Sistema Asamblea PRO
                </h1>
            </div>
            <LoginForm/>
        </div>
    )
}