import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState } from "react"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  // Siempre mostrar a pantalla completa, tanto en PC como en móvil
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  )
}