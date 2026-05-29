// ============================================================================
// Combobox — generic autocomplete UI (no domain knowledge)
// ============================================================================
// WHAT:  Text input + dropdown list + keyboard navigation.
// WHY:   SKU/warehouse/supplier pickers share the same UX shell.
// HOW:   Parent supplies items and renderItem; this component handles interaction.
// ============================================================================

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export type ComboboxProps<T> = {
  /** Text shown in the input (typing or selected label). */
  inputValue: string
  onInputChange: (value: string) => void
  /** Options to show in the dropdown. */
  items: T[]
  onSelect: (item: T) => void
  getItemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  isLoading?: boolean
  placeholder?: string
  emptyMessage?: string
  hintMessage?: string
  disabled?: boolean
  label?: string
}

/**
 * Reusable combobox: input + listbox. Does not fetch data — only renders it.
 */
export function Combobox<T>({
  inputValue,
  onInputChange,
  items,
  onSelect,
  getItemKey,
  renderItem,
  isLoading = false,
  placeholder = 'Search…',
  emptyMessage = 'No results found',
  hintMessage = 'Type at least 2 characters',
  disabled = false,
  label,
}: ComboboxProps<T>) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const openDropdown = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const selectItem = (item: T) => {
    onSelect(item)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      openDropdown()
      return
    }

    if (!isOpen) {
      return
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        setActiveIndex((current) =>
          items.length === 0 ? -1 : (current + 1) % items.length,
        )
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        setActiveIndex((current) =>
          items.length === 0
            ? -1
            : (current - 1 + items.length) % items.length,
        )
        break
      }
      case 'Enter': {
        event.preventDefault()
        if (activeIndex >= 0 && items[activeIndex]) {
          selectItem(items[activeIndex])
        } else if (items.length > 0) {
          selectItem(items[0])
        }
        break
      }
      case 'Escape': {
        event.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        break
      }
      default:
        break
    }
  }

  const showList = isOpen && !disabled
  const showHint = showList && items.length === 0 && !isLoading && hintMessage
  const showEmpty = showList && items.length === 0 && !isLoading && !showHint

  return (
    <div className="combobox" ref={containerRef}>
      {label ? <span className="combobox-label">{label}</span> : null}
      <div className="combobox-input-row">
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            onInputChange(event.target.value)
            setActiveIndex(-1)
            openDropdown()
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
      </div>
      {showList ? (
        <ul id={listboxId} className="combobox-dropdown" role="listbox">
          {isLoading ? (
            <li className="combobox-message" role="presentation">
              Searching…
            </li>
          ) : null}
          {showHint ? (
            <li className="combobox-message" role="presentation">
              {hintMessage}
            </li>
          ) : null}
          {showEmpty ? (
            <li className="combobox-message" role="presentation">
              {emptyMessage}
            </li>
          ) : null}
          {items.map((item, index) => (
            <li
              key={getItemKey(item)}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? 'combobox-option combobox-option-active'
                  : 'combobox-option'
              }
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                // Prevent input blur before click registers.
                event.preventDefault()
                selectItem(item)
              }}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
