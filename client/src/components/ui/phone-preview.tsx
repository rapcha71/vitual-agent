import { cn } from "@/lib/utils"

interface PhonePreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PhonePreview({ children, className, ...props }: PhonePreviewProps) {
  return (
    <div className={cn(
      "w-[320px] h-[640px] bg-white rounded-[2.5rem] shadow-xl relative overflow-hidden",
      "border-[14px] border-black",
      "before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2",
      "before:w-24 before:h-7 before:bg-black before:rounded-b-3xl",
      className
    )} {...props}>
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </div>
  )
}