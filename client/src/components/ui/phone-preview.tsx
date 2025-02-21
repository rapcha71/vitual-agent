import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className={cn(
        "w-[320px] h-[600px] bg-white overflow-hidden relative",
        "border-[8px] border-black rounded-[30px]",
        "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
        "before:w-16 before:h-6 before:bg-black before:rounded-b-2xl",
        "shadow-[0_8px_16px_rgba(0,0,0,0.1)]",
        className
      )} {...props}>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}