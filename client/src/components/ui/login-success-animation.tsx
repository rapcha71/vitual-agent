import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginSuccessAnimation({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: [0.5, 1.2, 1],
        opacity: [0, 1, 1],
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{
          scale: [0, 1.2, 1],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{
            scale: 1,
          }}
          transition={{ duration: 0.2, delay: 0.5 }}
          className="rounded-full bg-primary p-2"
        >
          <Check className="h-8 w-8 text-primary-foreground" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="text-xl font-semibold"
        >
          Welcome back!
        </motion.h2>
      </motion.div>
    </motion.div>
  );
}
