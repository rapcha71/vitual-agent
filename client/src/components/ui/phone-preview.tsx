import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-screen bg-gray-100",
      "overflow-hidden", 
      "[-ms-overflow-style:'none']", 
      "[scrollbar-width:none]", 
      "[&::-webkit-scrollbar]:hidden" 
    )}>
      <div className={cn(
        "w-[340px] aspect-[9/16] bg-white relative",
        "border-[8px] border-black rounded-[30px]",
        "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
        "before:w-20 before:h-4 before:bg-black before:rounded-b-2xl",
        "after:content-[''] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2",
        "after:w-24 after:h-1 after:bg-black after:rounded-full",
        "shadow-[0_8px_16px_rgba(0,0,0,0.1)]",
        "overflow-hidden",
        className
      )} {...props}>
        <div className="h-full overflow-y-auto [-ms-overflow-style:'none'] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  )
}