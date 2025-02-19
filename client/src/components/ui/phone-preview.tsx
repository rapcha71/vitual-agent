import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className={cn(
        "w-[320px] h-[640px] bg-white overflow-hidden relative",
        "border-[8px] border-black rounded-[30px]",
        "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
        "before:w-20 before:h-4 before:bg-black before:rounded-b-2xl",
        className
      )} {...props}>
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}