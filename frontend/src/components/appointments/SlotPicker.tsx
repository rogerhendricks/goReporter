import { cn } from '@/lib/utils'
import type { AppointmentSlot } from '@/services/appointmentService'

interface SlotPickerProps {
  slots: AppointmentSlot[]
  selectedTime?: string
  onSelectSlot: (slotTime: string) => void
  disabled?: boolean
}

export function SlotPicker({ slots, selectedTime, onSelectSlot, disabled }: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No slots available for this date
      </div>
    )
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-AU', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      <div className="text-xs font-medium text-muted-foreground mb-3">
        Available Time Slots (8:00 AM - 11:30 AM Sydney time)
      </div>
      {slots.map((slot) => {
        const isSelected = selectedTime && Math.abs(new Date(slot.slotTime).getTime() - new Date(selectedTime).getTime()) < 1000
        const isFull = slot.remaining === 0
        const bookedCount = slot.total - slot.remaining

        return (
          <button
            key={slot.slotTime}
            type="button"
            onClick={() => !isFull && !disabled && onSelectSlot(slot.slotTime)}
            disabled={isFull || disabled}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
              isFull && "opacity-50 cursor-not-allowed hover:border-border",
              !isFull && !isSelected && "border-border hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-sm font-medium min-w-[80px]",
                isFull ? "text-muted-foreground" : "text-foreground"
              )}>
                {formatTime(slot.slotTime)}
              </span>
              
              {/* Slot capacity dots */}
              <div className="flex items-center gap-1">
                {Array.from({ length: slot.total }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i < bookedCount 
                        ? "bg-rose-500" 
                        : "bg-emerald-500"
                    )}
                    title={i < bookedCount ? "Booked" : "Available"}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium",
                isFull ? "text-rose-600" : "text-emerald-600"
              )}>
                {isFull ? 'Full' : `${slot.remaining} available`}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
