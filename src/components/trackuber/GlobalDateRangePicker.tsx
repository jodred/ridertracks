import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { useStore } from "../../lib/trackuber/store";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { formatDateShort, parseISO, todayISO } from "../../lib/trackuber/calc";
import type { DateRangePreset } from "../../lib/trackuber/types";

const presets: { key: DateRangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

export function GlobalDateRangePicker() {
  const { range, setPreset, setCustomRange } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"presets" | "custom">("presets");
  const [from, setFrom] = useState<Date | undefined>(parseISO(range.from));
  const [to, setTo] = useState<Date | undefined>(parseISO(range.to));

  const label =
    range.preset === "custom"
      ? `${formatDateShort(range.from)} → ${formatDateShort(range.to)}`
      : presets.find((p) => p.key === range.preset)?.label ?? "Range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full border-border bg-card px-4 shadow-soft">
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("presets")}
            className={`flex-1 py-2 text-xs font-medium ${tab === "presets" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Presets
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`flex-1 py-2 text-xs font-medium ${tab === "custom" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Custom
          </button>
        </div>
        {tab === "presets" ? (
          <div className="grid grid-cols-2 gap-1 p-2">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  setOpen(false);
                }}
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  range.preset === p.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">From</div>
            <Calendar mode="single" selected={from} onSelect={setFrom} className="pointer-events-auto" />
            <div className="mb-2 mt-3 text-xs font-medium text-muted-foreground">To</div>
            <Calendar mode="single" selected={to} onSelect={setTo} className="pointer-events-auto" />
            <Button
              className="mt-3 w-full"
              onClick={() => {
                if (from && to) {
                  const f = todayISO(from);
                  const t = todayISO(to);
                  setCustomRange(f <= t ? f : t, f <= t ? t : f);
                  setOpen(false);
                }
              }}
            >
              Apply range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}