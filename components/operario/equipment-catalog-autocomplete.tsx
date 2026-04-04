"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type EquipmentCatalogCategory = "PANEL" | "INVERTER" | "BATTERY";

type Props = {
  category: EquipmentCatalogCategory;
  field: "brand" | "model";
  /** Para campo modelo: filtra por marca elegida */
  brandFilter?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName: string;
  sunMode: boolean;
};

const DEBOUNCE_MS = 260;

export function EquipmentCatalogAutocomplete({
  category,
  field,
  brandFilter = "",
  value,
  onChange,
  placeholder,
  inputClassName,
  sunMode,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          category,
          field,
          q,
          brand: field === "model" ? brandFilter : "",
        });
        const res = await fetch(`/api/equipment-catalog/suggest?${params}`, {
          credentials: "same-origin",
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [category, field, brandFilter],
  );

  const scheduleFetch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetchSuggestions(q);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (recordDebounceRef.current) clearTimeout(recordDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function maybeRecordPair(brand: string, model: string) {
    const b = brand.trim();
    const m = model.trim();
    if (!b || !m) return;
    if (recordDebounceRef.current) clearTimeout(recordDebounceRef.current);
    recordDebounceRef.current = setTimeout(() => {
      void fetch("/api/equipment-catalog/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ category, brand: b, model: m }),
      }).catch(() => {});
    }, 400);
  }

  const onPick = (text: string) => {
    onChange(text);
    setOpen(false);
    setSuggestions([]);
    if (field === "model") {
      maybeRecordPair(brandFilter, text);
    }
  };

  const listBg = sunMode
    ? "border-2 border-neutral-800 bg-white shadow-lg"
    : "border border-slate-600 bg-slate-950 shadow-xl";
  const itemHover = sunMode ? "hover:bg-neutral-100" : "hover:bg-slate-800";

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <input
        id={id}
        role="combobox"
        className={inputClassName}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setOpen(true);
          scheduleFetch(v);
        }}
        onFocus={() => {
          setOpen(true);
          void fetchSuggestions(value);
        }}
        onBlur={() => {
          if (field === "model" && brandFilter.trim() && value.trim()) {
            maybeRecordPair(brandFilter, value);
          }
        }}
      />
      {open && (suggestions.length > 0 || loading) ? (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg py-1 text-sm ${listBg}`}
        >
          {loading && suggestions.length === 0 ? (
            <li className={`px-3 py-2 text-xs ${sunMode ? "text-neutral-600" : "text-slate-400"}`}>
              Buscando...
            </li>
          ) : null}
          {suggestions.map((s) => (
            <li key={s} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === s}
                className={`w-full px-3 py-2 text-left text-xs font-medium ${sunMode ? "text-neutral-900" : "text-slate-200"} ${itemHover}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
