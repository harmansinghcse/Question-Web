import { useId, useMemo, useRef, useState } from "react";

export interface ComboOption {
    id: number;
    label: string;
}

interface Props {
    id: string;
    options: ComboOption[];
    value: ComboOption | null;
    onChange: (option: ComboOption | null) => void;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    invalid?: boolean;
    describedBy?: string;
    placeholder?: string;
    /** Plural noun used in status text, e.g. "departments". */
    noun?: string;
    disabled?: boolean;
}

/** Accessible searchable dropdown (ARIA 1.2 combobox pattern). */
export default function SearchableSelect({
    id,
    options,
    value,
    onChange,
    loading,
    error,
    onRetry,
    invalid,
    describedBy,
    placeholder = "Search…",
    noun = "items",
    disabled,
}: Props) {
    const listId = useId();
    const [query, setQuery] = useState(value?.label ?? "");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const blurTimer = useRef<number | undefined>(undefined);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || value) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query, value]);

    const select = (option: ComboOption) => {
        onChange(option);
        setQuery(option.label);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && open && filtered[active]) {
            e.preventDefault();
            select(filtered[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const optionId = (i: number) => `${listId}-opt-${i}`;

    return (
        <div className="relative">
            <input
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                aria-activedescendant={
                    open && filtered[active] ? optionId(active) : undefined
                }
                autoComplete="off"
                value={query}
                placeholder={loading ? `Loading ${noun}…` : placeholder}
                disabled={loading || disabled}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                    setOpen(true);
                    if (value) onChange(null);
                }}
                onFocus={() => {
                    window.clearTimeout(blurTimer.current);
                    setOpen(true);
                }}
                onBlur={() => {
                    blurTimer.current = window.setTimeout(
                        () => setOpen(false),
                        120,
                    );
                }}
                onKeyDown={onKeyDown}
                className={`w-full rounded-md bg-neutral-950 border px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    invalid ? "border-red-500/70" : "border-neutral-700"
                }`}
            />

            {open && !loading && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-xl shadow-black/40"
                >
                    {error ? (
                        <li className="px-3 py-3 text-sm text-red-400 flex items-center justify-between gap-3">
                            <span>Couldn't load {noun}.</span>
                            {onRetry && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={onRetry}
                                    className="underline underline-offset-2 hover:text-red-300"
                                >
                                    Retry
                                </button>
                            )}
                        </li>
                    ) : filtered.length === 0 ? (
                        <li className="px-3 py-3 text-sm text-neutral-500">
                            {options.length === 0
                                ? `No ${noun} available.`
                                : `No ${noun} match "${query}".`}
                        </li>
                    ) : (
                        filtered.map((o, i) => (
                            <li
                                key={o.id}
                                id={optionId(i)}
                                role="option"
                                aria-selected={value?.id === o.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => select(o)}
                                onMouseEnter={() => setActive(i)}
                                className={`cursor-pointer px-3 py-2 text-sm ${
                                    i === active
                                        ? "bg-red-900/30 text-neutral-100"
                                        : "text-neutral-300"
                                } ${value?.id === o.id ? "border-l-2 border-red-500" : ""}`}
                            >
                                {o.label}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
