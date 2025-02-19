import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div 
        className={cn(
          "w-[375px] h-[667px] bg-primary rounded-[40px] border-8 border-black relative overflow-hidden shadow-2xl",
          "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-[150px] before:h-[30px] before:bg-black before:rounded-b-[20px]",
          className
        )} 
        {...props}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
