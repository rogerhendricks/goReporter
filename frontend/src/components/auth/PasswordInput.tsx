import { forwardRef, useState } from 'react'
// import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PasswordStrengthIndicator } from '../auth/PasswordStrengthIndicator'
import { cn } from '@/lib/utils'

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [password, setPassword] = useState('')

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            className={cn('pr-10', className)}
            ref={ref}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              props.onChange?.(e)
            }}
            {...props}
          />
          {/* <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button> */}
        </div>
        
        {showStrength && <PasswordStrengthIndicator password={password} />}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }