"use client";

import { Globe2, Loader2, MapPin, Plus, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { destinationKey, searchCurated } from "@/lib/destinations";
import { STATE_NAMES } from "@/lib/geo/india";
import type { DestinationInput } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Option {
  key: string;
  d: DestinationInput;
  source: "curated" | "search";
}

export function DestinationSearch({
  onSelect,
  existing,
  autoFocus,
}: {
  onSelect: (d: DestinationInput) => void;
  existing: DestinationInput[];
  autoFocus?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [remote, setRemote] = React.useState<DestinationInput[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [manual, setManual] = React.useState(false);
  const listId = React.useId();
  const taken = React.useMemo(() => new Set(existing.map(destinationKey)), [existing]);

  // Remote geocoder (debounced)
  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setRemote([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        setRemote(json.results ?? []);
      } catch {
        /* offline or aborted — curated results still work */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const options: Option[] = React.useMemo(() => {
    const out: Option[] = [];
    const seen = new Set<string>();
    for (const d of searchCurated(q, 6)) {
      const key = destinationKey(d);
      seen.add(key);
      const { city, state, country, latitude, longitude, tags } = d;
      out.push({ key, d: { city, state, country, latitude, longitude, tags }, source: "curated" });
    }
    for (const d of remote) {
      const key = destinationKey(d);
      // Same city name + state already present from curated? skip
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, d, source: "search" });
    }
    return out.slice(0, 9);
  }, [q, remote]);

  const choose = (o: Option) => {
    if (taken.has(o.key)) return;
    onSelect(o.d);
    setQ("");
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key === "ArrowDown") setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (o) choose(o);
    } else if (e.key === "Escape") setOpen(false);
  };

  if (manual)
    return (
      <ManualDestination
        initialCity={q}
        onCancel={() => setManual(false)}
        onAdd={(d) => {
          onSelect(d); // parent rejects duplicates with a message
          setManual(false);
          setQ("");
        }}
      />
    );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Search a city or place — e.g. Manali, Hampi, Goa"
          className="pl-11 pr-10"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {searching && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </div>

      {open && q.trim().length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-2xl"
        >
          {options.map((o, i) => {
            const isTaken = taken.has(o.key);
            return (
              <button
                type="button"
                key={o.key}
                role="option"
                aria-selected={i === active}
                disabled={isTaken}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                  i === active && !isTaken && "bg-cream-100",
                  isTaken && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sunset-500/10 text-sunset-600">
                  {o.d.country === "India" ? <MapPin className="size-4" /> : <Globe2 className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{o.d.city}</span>
                  <span className="block truncate text-xs text-muted">
                    {[o.d.state, o.d.country].filter(Boolean).join(", ")}
                  </span>
                </span>
                {isTaken && <span className="text-xs font-semibold text-muted">Added</span>}
              </button>
            );
          })}
          {options.length === 0 && !searching && (
            <p className="px-4 py-3 text-sm text-muted">No matches yet — keep typing or add it manually.</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setManual(true)}
            className="flex w-full items-center gap-2 border-t border-navy-900/8 px-4 py-3 text-left text-sm font-semibold text-electric-600 hover:bg-electric-500/5"
          >
            <Plus className="size-4" /> Can&apos;t find it? Add “{q.trim()}” manually
          </button>
        </div>
      )}
    </div>
  );
}

function ManualDestination({
  initialCity,
  onAdd,
  onCancel,
}: {
  initialCity: string;
  onAdd: (d: DestinationInput) => void;
  onCancel: () => void;
}) {
  const [city, setCity] = React.useState(initialCity.trim());
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [error, setError] = React.useState<string | null>(null);
  const abroad = state === "__abroad";

  const submit = () => {
    const c = city.trim();
    if (c.length < 2 || c.length > 100 || !/[a-zA-ZÀ-ɏऀ-ॿ]/.test(c)) return setError("Enter a valid place name");
    if (!state) return setError("Pick a state, or choose Outside India");
    if (abroad && country.trim().length < 2) return setError("Enter the country");
    onAdd({
      city: c.replace(/\s+/g, " "),
      state: abroad ? null : state,
      country: abroad ? country.trim() : "India",
      latitude: null,
      longitude: null,
      tags: [],
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-electric-400/40 bg-electric-500/5 p-4">
      <p className="text-sm font-semibold">Add a place manually</p>
      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Place name" aria-label="Place name" />
      <Select value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
        <option value="">Select state / UT…</option>
        {STATE_NAMES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        <option value="__abroad">Outside India</option>
      </Select>
      {abroad && <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" aria-label="Country" />}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <p className="text-xs text-muted">Manual places count towards your states and cities, but won&apos;t get a map pin.</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="electric" onClick={submit}>
          Add place
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
