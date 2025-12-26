import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  onBlurValidation?: (value: string) => void
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, error, onBlurValidation, onBlur, ...props }, ref) => {
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (onBlurValidation) {
        onBlurValidation(e.target.value)
      }
      if (onBlur) {
        onBlur(e)
      }
    }

    return (
      <div className="relative w-full">
        <Input
          className={cn(
            className,
            error && "border-red-500 focus-visible:ring-red-500 pr-8"
          )}
          ref={ref}
          onBlur={handleBlur}
          {...props}
        />
        {error && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }
)
ValidatedInput.displayName = "ValidatedInput"

export { ValidatedInput }
