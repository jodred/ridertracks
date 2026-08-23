import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
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
  const [tab, setTab] = useState<"presets" | "custom">(range.preset === "custom" ? "custom" : "presets");
  const [selected, setSelected] = useState<DayPickerRange | undefined>({
    from: parseISO(range.from),
    to: parseISO(range.to),
  });

  useEffect(() => {
    setSelected({ from: parseISO(range.from), to: parseISO(range.to) });
  }, [range.from, range.to]);

  const label =
    range.preset === "custom"
      ? range.from === range.to
        ? formatDateShort(range.from)
        : `${formatDateShort(range.from)} → ${formatDateShort(range.to)}`
      : presets.find((p) => p.key === range.preset)?.label ?? "Range";

  const applySelection = (sel: DayPickerRange | undefined) => {
    if (!sel?.from || !sel.to) return;
    const from = todayISO(sel.from);
    const to = todayISO(sel.to);
    setCustomRange(from <= to ? from : to, from <= to ? to : from);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && tab === "custom") setSelected(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full border-border bg-card px-4 shadow-soft">
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("presets")}
            className={`flex-1 py-2 text-xs font-medium ${tab === "presets" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Presets
          </button>
          <button
            onClick={() => {
              setTab("custom");
              setSelected(undefined);
            }}
            className={`flex-1 py-2 text-xs font-medium ${tab === "custom" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Custom
          </button>
        </div>
        {tab === "presets" ? (
          <div className="grid w-[280px] grid-cols-2 gap-1 p-2">
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
            <Calendar
              mode="range"
              selected={selected}
              onSelect={(sel) => {
                setSelected(sel);
                // A custom range is only active once the user has selected both dates.
                if (sel?.from && sel.to) {
                  applySelection(sel);
                  setOpen(false);
                }
              }}
              numberOfMonths={1}
              className="pointer-events-auto"
            />
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Select a start date, then an end date to apply a custom range.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
