"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui";

export type ComboboxOption = {
  value: string;
  label: string;
  subLabel?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  id?: string;
};

export function Combobox({ options, value, onChange, placeholder = "Selecione...", emptyText = "Nenhum resultado", id }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        // If they didn't select a valid option and closed it, reset query to the selected label or empty
        const selected = options.find(o => o.value === value);
        if (selected) {
          setQuery(selected.label);
        } else {
          setQuery("");
          onChange(""); // Ensure it's cleared if they typed something invalid
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [options, value, onChange]);

  // When value changes from outside (e.g., initial load or reset)
  useEffect(() => {
    const selected = options.find(o => o.value === value);
    if (selected) {
      setQuery(selected.label);
    } else if (value === "") {
      setQuery("");
    }
  }, [value, options]);

  const filteredOptions = query === "" 
    ? options 
    : options.filter(o => {
        const q = query.toLowerCase().replace(/\D/g, ""); // extract numbers for phone search
        const isMatchLabel = o.label.toLowerCase().includes(query.toLowerCase());
        const isMatchSub = o.subLabel?.toLowerCase().includes(query.toLowerCase()) || 
                          (q && o.subLabel?.replace(/\D/g, "").includes(q));
        return isMatchLabel || !!isMatchSub;
      });

  return (
    <div className="relative w-full" ref={ref}>
      <Input 
        id={id}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // Auto clear value if they change query so they MUST select again
          if (value !== "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        className="w-full"
        autoComplete="off"
      />
      
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
                className={`flex cursor-pointer flex-col rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--accent-soft)] ${
                  value === option.value ? "bg-[color:var(--accent-soft)] font-medium text-[color:var(--accent-strong)]" : "text-slate-700"
                }`}
              >
                <span>{option.label}</span>
                {option.subLabel && <span className="text-xs text-slate-500">{option.subLabel}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
