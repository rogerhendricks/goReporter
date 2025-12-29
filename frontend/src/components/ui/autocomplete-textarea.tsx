import React, { useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useAutocomplete } from '@/hooks/useAutocomplete'

interface AutocompleteTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  suggestions: string[]
  onValueChange?: (value: string) => void
}

export function AutocompleteTextarea({
  suggestions,
  value,
  onValueChange,
  className,
  ...props
}: AutocompleteTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState(String(value || ''))
  const [cursorPosition, setCursorPosition] = useState(0)
  const {
    matches,
    showSuggestions,
    selectedIndex,
    findMatches,
    selectSuggestion,
    handleKeyDown,
    reset,
    // setShowSuggestions
  } = useAutocomplete({ suggestions, minChars: 2, maxSuggestions: 5 })

  // Get the current word being typed
  const getCurrentWord = (text: string, position: number) => {
    const beforeCursor = text.substring(0, position)
    const afterCursor = text.substring(position)
    
    // Find word boundaries
    const wordStart = beforeCursor.search(/\S+$/)
    const wordEnd = afterCursor.search(/\s/)
    
    if (wordStart === -1) return { word: '', start: position, end: position }
    
    const start = wordStart
    const end = wordEnd === -1 ? text.length : position + wordEnd
    const word = text.substring(start, end)
    
    return { word, start, end }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPos = e.target.selectionStart
    
    setInputValue(newValue)
    setCursorPosition(newCursorPos)
    onValueChange?.(newValue)
    
    const { word } = getCurrentWord(newValue, newCursorPos)
    findMatches(word)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const handled = handleKeyDown(e)
    
    if (handled && e.key === 'Enter' && selectedIndex >= 0) {
      const suggestion = selectSuggestion(selectedIndex)
      if (suggestion) {
        const { start, end } = getCurrentWord(inputValue, cursorPosition)
        const before = inputValue.substring(0, start)
        const after = inputValue.substring(end)
        const newValue = before + suggestion + after
        
        setInputValue(newValue)
        onValueChange?.(newValue)
        reset()
        
        // Set cursor position after the inserted suggestion
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = start + suggestion.length
            textareaRef.current.setSelectionRange(newPos, newPos)
            textareaRef.current.focus()
          }
        }, 0)
      }
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    const { start, end } = getCurrentWord(inputValue, cursorPosition)
    const before = inputValue.substring(0, start)
    const after = inputValue.substring(end)
    const newValue = before + suggestion + after
    
    setInputValue(newValue)
    onValueChange?.(newValue)
    reset()
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + suggestion.length
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleTextareaChange}
        onKeyDown={handleTextareaKeyDown}
        className={className}
        {...props}
      />
      
      {showSuggestions && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-md bg-popover border rounded-md shadow-lg">
          <div className="py-1 max-h-60 overflow-auto">
            {matches.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}