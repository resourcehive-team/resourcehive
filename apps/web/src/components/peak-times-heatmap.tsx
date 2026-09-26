import { Fragment } from "react";

import type { PeakSlot } from "@/lib/booking-service/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function PeakTimesHeatmap({ peakTimes }: { peakTimes: PeakSlot[] }) {
  if (peakTimes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bookings in this range yet, so no peak times to show.
      </p>
    );
  }

  const countByCell = new Map<string, number>();
  let maxCount = 0;

  for (const slot of peakTimes) {
    countByCell.set(`${slot.dayOfWeek}-${slot.hour}`, slot.bookingCount);
    maxCount = Math.max(maxCount, slot.bookingCount);
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-[3rem_repeat(24,1fr)] gap-0.5">
        <div />
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="text-center text-[10px] text-muted-foreground"
          >
            {hour % 3 === 0 ? hour : ""}
          </div>
        ))}
        {DAY_LABELS.map((label, dayOfWeek) => (
          <Fragment key={label}>
            <div className="pr-2 text-right text-xs font-medium leading-6">
              {label}
            </div>
            {HOURS.map((hour) => {
              const count = countByCell.get(`${dayOfWeek}-${hour}`) ?? 0;
              const intensity = maxCount === 0 ? 0 : count / maxCount;

              return (
                <div
                  key={hour}
                  role="img"
                  aria-label={`${label} ${hour}:00 — ${count} booking${count === 1 ? "" : "s"}`}
                  title={`${label} ${hour}:00 — ${count} booking${count === 1 ? "" : "s"}`}
                  className="h-6 border border-line"
                  style={{
                    backgroundColor:
                      intensity === 0
                        ? "transparent"
                        : `rgba(180, 83, 9, ${0.15 + intensity * 0.65})`,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
