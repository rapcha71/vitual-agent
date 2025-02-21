import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className={cn(
        "w-[375px] h-[667px] bg-white overflow-hidden relative", // iPhone 8 dimensions
        "border-[12px] border-black rounded-[48px]",
        "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
        "before:w-24 before:h-6 before:bg-black before:rounded-b-3xl",
        "after:content-[''] after:absolute after:bottom-3 after:left-1/2 after:-translate-x-1/2",
        "after:w-32 after:h-1 after:bg-black after:rounded-full",
        "shadow-[0_8px_40px_rgba(0,0,0,0.2)]",
        className
      )} {...props}>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}