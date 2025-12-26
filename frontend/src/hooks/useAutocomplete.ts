import { useState, useCallback } from 'react'

interface UseAutocompleteOptions {
  suggestions: string[]
  minChars?: number
  maxSuggestions?: number
}

export function useAutocomplete({
  suggestions,
  minChars = 2,
  maxSuggestions = 5
}: UseAutocompleteOptions) {
  const [matches, setMatches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const findMatches = useCallback((input: string) => {
    if (!input || input.length < minChars) {
      setMatches([])
      setShowSuggestions(false)
      return
    }

    const searchTerm = input.toLowerCase()
    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(searchTerm)
      )
      .slice(0, maxSuggestions)

    setMatches(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedIndex(-1)
  }, [suggestions, minChars, maxSuggestions])

  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < matches.length) {
      return matches[index]
    }
    return null
  }, [matches])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return false

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < matches.length - 1 ? prev + 1 : 0
        )
        return true
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : matches.length - 1
        )
        return true
      
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          return true
        }
        return false
      
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        return true
      
      default:
        return false
    }
  }, [showSuggestions, selectedIndex, matches.length])

  const reset = useCallback(() => {
    setMatches([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [])

  return {
    matches,
    showSuggestions,
    selectedIndex,
    findMatches,
    selectSuggestion,
    handleKeyDown,
    reset,
    setShowSuggestions
  }
}