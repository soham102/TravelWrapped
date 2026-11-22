"use client";

import { ArrowDown, ArrowUp, Camera, ImagePlus, MapPin, Trash2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { ChoiceChips, Field, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { MAX_PHOTOS_PER_TRIP } from "@/lib/config";
import { destinationKey } from "@/lib/destinations";
import { resizeImage, validateImage } from "@/lib/image";
import {
  TRAVEL_CATEGORIES,
  TRIP_TYPES,
  type DestinationInput,
  type Photo,
  type TravelCategory,
  type Trip,
  type TripInput,
  type TripType,
} from "@/lib/types";
import { errorMessage, tripDays } from "@/lib/utils";
import { DestinationSearch } from "./destination-search";

type Errors = Partial<Record<"destinations" | "trip_name" | "dates" | "distance_km" | "notes" | "memorable", string>>;

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

export function TripForm({ initial, onSaved }: { initial?: Trip; onSaved: (t: Trip) => void }) {
  const { store } = useAuth();
  const [destinations, setDestinations] = React.useState<DestinationInput[]>(
    initial?.destinations.map(({ id: _id, ...d }) => (void _id, d)) ?? [],
  );
  const [tripName, setTripName] = React.useState(initial?.trip_name ?? "");
  const [start, setStart] = React.useState(initial?.start_date ?? "");
  const [end, setEnd] = React.useState(initial?.end_date ?? "");
  const [tripType, setTripType] = React.useState<TripType>(initial?.trip_type ?? "Solo");
  const [category, setCategory] = React.useState<TravelCategory>(initial?.travel_category ?? "Leisure");
  const [memorable, setMemorable] = React.useState(initial?.memorable_experience ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [distance, setDistance] = React.useState(initial?.distance_km != null ? String(initial.distance_km) : "");
  const [photos, setPhotos] = React.useState<Photo[]>(initial?.photos ?? []);
  const [pending, setPending] = React.useState<PendingPhoto[]>([]);
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), [pending]);

  const addDestination = (d: DestinationInput) => {
    if (destinations.some((x) => destinationKey(x) === destinationKey(d))) {
      toast.error(`${d.city} is already in this trip`);
      return;
    }
    if (destinations.length >= 15) {
      toast.error("Up to 15 stops per trip");
      return;
    }
    setDestinations((ds) => [...ds, d]);
    setErrors((e) => ({ ...e, destinations: undefined }));
  };

  const move = (i: number, dir: -1 | 1) =>
    setDestinations((ds) => {
      const next = [...ds];
      const j = i + dir;
      if (j < 0 || j >= next.length) return ds;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS_PER_TRIP - photos.length - pending.length;
    const list = Array.from(files);
    if (list.length > room) toast.error(`You can add up to ${MAX_PHOTOS_PER_TRIP} photos per trip`);
    const accepted: PendingPhoto[] = [];
    for (const f of list.slice(0, Math.max(0, room))) {
      const err = validateImage(f);
      if (err) toast.error(err);
      else accepted.push({ id: `${f.name}-${f.size}-${f.lastModified}`, file: f, preview: URL.createObjectURL(f) });
    }
    setPending((p) => [...p, ...accepted]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeExisting = async (p: Photo) => {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    try {
      await store.deletePhoto(p);
      setPhotos((ps) => ps.filter((x) => x.id !== p.id));
      toast.success("Photo deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const validate = (): TripInput | null => {
    const e: Errors = {};
    if (destinations.length === 0) e.destinations = "Add at least one destination";
    const name = (tripName.trim() || (destinations[0] ? `${destinations[0].city} trip` : "")).slice(0, 120);
    if (!name) e.trip_name = "Give your trip a name";
    if (!start || !end) e.dates = "Pick start and end dates";
    else if (end < start) e.dates = "End date can't be before the start date";
    else if (tripDays(start, end) > 366) e.dates = "Trips can be at most a year long";
    else if (Number(start.slice(0, 4)) < 2000 || Number(end.slice(0, 4)) > 2100) e.dates = "Dates look out of range";
    let km: number | null = null;
    if (distance.trim()) {
      km = Number(distance);
      if (!Number.isFinite(km) || km < 0 || km >= 100000) e.distance_km = "Enter a distance between 0 and 99,999 km";
    }
    if (notes.length > 2000) e.notes = "Notes can be up to 2,000 characters";
    if (memorable.length > 500) e.memorable = "Keep it under 500 characters";
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      trip_name: name,
      start_date: start,
      end_date: end,
      trip_type: tripType,
      travel_category: category,
      notes: notes.trim() || null,
      memorable_experience: memorable.trim() || null,
      distance_km: km,
      destinations,
    };
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const input = validate();
    if (!input) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      let trip = await store.saveTrip(input, initial?.id);
      if (!initial) track("trip_created", { destinations: input.destinations.length, category: input.travel_category });
      let failed = 0;
      for (const p of pending) {
        try {
          // Local mode stores photos in browser storage (~5 MB), so keep them compact there.
          const blob = store.mode === "local" ? await resizeImage(p.file, 900, 0.72) : await resizeImage(p.file);
          await store.uploadPhoto(trip.id, blob);
        } catch {
          failed++;
        }
      }
      if (pending.length) trip = (await store.getTrip(trip.id)) ?? trip;
      if (failed) toast.error(`${failed} photo${failed > 1 ? "s" : ""} couldn't be uploaded`);
      toast.success(initial ? "Trip updated" : "Trip added to your year ✈️");
      onSaved(trip);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const days = start && end && end >= start ? tripDays(start, end) : null;

  return (
    <form onSubmit={submit} className="space-y-5 pb-28" noValidate>
      <Card>
        <h2 className="font-display text-lg font-bold">Where did you go?</h2>
        <p className="mb-4 text-sm text-muted">Add one stop or a whole route — in the order you travelled.</p>
        <DestinationSearch onSelect={addDestination} existing={destinations} autoFocus={!initial} />
        {errors.destinations && <p className="mt-2 text-sm font-medium text-red-600">{errors.destinations}</p>}
        {destinations.length > 0 && (
          <ol className="mt-4 space-y-2">
            {destinations.map((d, i) => (
              <li key={destinationKey(d)} className="flex items-center gap-3 rounded-2xl bg-cream-100 px-3 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-cream-100">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.city}</p>
                  <p className="truncate text-xs text-muted">
                    {[d.state, d.country].filter(Boolean).join(", ")}
                    {d.latitude == null && " · no map pin"}
                  </p>
                </div>
                <div className="flex items-center">
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp />
                  </IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === destinations.length - 1}>
                    <ArrowDown />
                  </IconBtn>
                  <IconBtn label={`Remove ${d.city}`} onClick={() => setDestinations((ds) => ds.filter((_, j) => j !== i))}>
                    <X />
                  </IconBtn>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">When?</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" htmlFor="start">
            <Input id="start" type="date" value={start} onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} aria-invalid={!!errors.dates} />
          </Field>
          <Field label="End date" htmlFor="end">
            <Input id="end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} aria-invalid={!!errors.dates} />
          </Field>
        </div>
        {errors.dates ? (
          <p className="text-sm font-medium text-red-600">{errors.dates}</p>
        ) : days ? (
          <p className="text-sm text-muted">{days === 1 ? "A day trip" : `${days} days`}</p>
        ) : null}
        <Field label="Trip name" htmlFor="name" error={errors.trip_name} hint={destinations[0] && !tripName ? `Leave empty to use “${destinations[0].city} trip”` : undefined}>
          <Input id="name" value={tripName} maxLength={120} onChange={(e) => setTripName(e.target.value)} placeholder="e.g. Monsoon in the Western Ghats" />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-display text-lg font-bold">The vibe</h2>
        <div>
          <p className="mb-2 text-sm font-semibold">Who with?</p>
          <ChoiceChips name="Trip type" options={TRIP_TYPES} value={tripType} onChange={setTripType} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">What kind of trip?</p>
          <ChoiceChips name="Travel category" options={TRAVEL_CATEGORIES} value={category} onChange={setCategory} />
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold">Memories <span className="text-sm font-normal text-muted">(optional)</span></h2>
          <p className="text-sm text-muted">Photos and moments appear in your Travel Highlights. They stay private.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-cream-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Trip photo" className="size-full object-cover" />
              <button type="button" onClick={() => removeExisting(p)} className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1.5 text-white" aria-label="Delete photo">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-2xl bg-cream-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="New photo" className="size-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-sunset-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
              <button type="button" onClick={() => setPending((ps) => ps.filter((x) => x.id !== p.id))} className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1.5 text-white" aria-label="Remove photo">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length + pending.length < MAX_PHOTOS_PER_TRIP && (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-navy-900/15 text-muted transition hover:border-sunset-400 hover:text-sunset-600">
              {photos.length + pending.length === 0 ? <Camera className="size-6" /> : <ImagePlus className="size-6" />}
              <span className="text-xs font-semibold">Add photos</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />

        <Field label="Most memorable moment" htmlFor="mem" error={errors.memorable}>
          <Textarea id="mem" value={memorable} maxLength={500} onChange={(e) => setMemorable(e.target.value)} placeholder="That sunrise at Tiger Hill when the clouds parted…" className="min-h-20" />
        </Field>
        <Field label="Notes" htmlFor="notes" error={errors.notes}>
          <Textarea id="notes" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Where you stayed, what you ate, who you met" />
        </Field>
        <Field label="Approx. distance travelled (km)" htmlFor="km" error={errors.distance_km} hint="Only used for your km stat when you enter it — we never guess.">
          <Input id="km" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 850" />
        </Field>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-900/10 bg-cream-50/90 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="hidden flex-1 text-sm text-muted sm:block">
            <MapPin className="mr-1 inline size-4" />
            {destinations.length ? `${destinations.length} stop${destinations.length > 1 ? "s" : ""}` : "No stops yet"}
          </div>
          <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
            {saving ? (pending.length ? "Saving & uploading…" : "Saving…") : initial ? "Save changes" : "Add trip"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function IconBtn({ children, label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className="rounded-full p-1.5 text-muted transition hover:bg-white hover:text-ink disabled:opacity-30 [&_svg]:size-4" {...props}>
      {children}
    </button>
  );
}
