import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div 
        className={cn(
          "w-[320px] h-[640px] bg-white rounded-[2rem] shadow-xl relative overflow-hidden",
          "border-[14px] border-black",
          "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
          "before:w-24 before:h-7 before:bg-black before:rounded-b-3xl",
          className
        )} 
        {...props}
      >
        <div className="h-full overflow-y-auto bg-gray-50">
          {children}
        </div>
      </div>
    </div>
  )
}