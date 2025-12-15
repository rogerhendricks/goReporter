import { useMemo } from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
}

interface PasswordRequirement {
  label: string
  met: boolean
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const requirements = useMemo((): PasswordRequirement[] => {
    const hasMinLength = password.length >= 12
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    const noSequential = !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)
    const noRepeated = !/(.)\1{2,}/.test(password)

    return [
      { label: 'At least 12 characters', met: hasMinLength },
      { label: 'One uppercase letter', met: hasUppercase },
      { label: 'One lowercase letter', met: hasLowercase },
      { label: 'One number', met: hasNumber },
      { label: 'One special character (!@#$%^&*)', met: hasSpecial },
      { label: 'No sequential characters (abc, 123)', met: noSequential || password.length === 0 },
      { label: 'No repeated characters (aaa, 111)', met: noRepeated || password.length === 0 },
    ]
  }, [password])

  const strength = useMemo(() => {
    if (password.length === 0) return { score: 0, label: '', color: '' }

    const metCount = requirements.filter(r => r.met).length
    const percentage = (metCount / requirements.length) * 100

    if (percentage < 40) {
      return { score: percentage, label: 'Weak', color: 'bg-red-500' }
    } else if (percentage < 70) {
      return { score: percentage, label: 'Fair', color: 'bg-yellow-500' }
    } else if (percentage < 100) {
      return { score: percentage, label: 'Good', color: 'bg-blue-500' }
    } else {
      return { score: percentage, label: 'Strong', color: 'bg-green-500' }
    }
  }, [requirements, password.length])

  if (password.length === 0) return null

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Password Strength</span>
          <span className={`font-medium ${
            strength.label === 'Weak' ? 'text-red-600' :
            strength.label === 'Fair' ? 'text-yellow-600' :
            strength.label === 'Good' ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Requirements:</p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  req.met ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                {req.met ? (
                  <Check className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}