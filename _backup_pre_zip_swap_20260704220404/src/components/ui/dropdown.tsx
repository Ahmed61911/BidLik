import { useEffect, useId, useRef, useState, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Render a hidden input for native form submission */
  name?: string;
  required?: boolean;
  size?: "sm" | "md";
}

/**
 * Custom dropdown — built from scratch (no shadcn / no Radix).
 * Uses a button trigger + absolutely-positioned menu with keyboard support.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  className,
  triggerClassName,
  disabled,
  ariaLabel,
  name,
  required,
  size = "md",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // Decide flip direction + scroll active into view when opened
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estHeight = Math.min(280, options.length * 36 + 8);
      setOpenUp(spaceBelow < estHeight && rect.top > spaceBelow);
    }
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    requestAnimationFrame(() => {
      const node = listRef.current?.querySelector<HTMLLIElement>(
        '[data-active="true"]',
      );
      node?.scrollIntoView({ block: "nearest" });
    });
  }, [open, options, value]);

  const move = (delta: number) => {
    setActiveIndex((prev) => {
      const len = options.length;
      let next = prev;
      for (let i = 0; i < len; i++) {
        next = (next + delta + len) % len;
        if (!options[next].disabled) return next;
      }
      return prev;
    });
  };

  const select = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) select(opt);
    } else if (e.key === "Tab") {
      close();
    }
  };

  const heightCls = size === "sm" ? "h-8 text-xs px-2.5" : "h-10 text-sm px-3";

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          "group flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background shadow-sm transition-colors",
          "hover:border-accent/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-accent ring-2 ring-ring ring-offset-1 ring-offset-background",
          heightCls,
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-accent",
          )}
        />
      </button>

      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute left-0 right-0 z-50 max-h-[280px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            openUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top",
          )}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                data-active={isActive}
                onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors",
                  isActive && !opt.disabled && "bg-accent/10 text-foreground",
                  isSelected && "font-medium text-accent",
                  opt.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-muted-foreground">
              Aucune option
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
