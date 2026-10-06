'use client';

import type { Muscle, VolumeSummary } from '@mesocycle/shared';
import { useCallback, useId, useState } from 'react';
import type { Contribution } from '../../lib/builder/volume';
import { VolumeChip } from './VolumeChip';
import { VolumeDetailPopover } from './VolumeDetailPopover';

type Props = {
  volume: VolumeSummary;
  contributionsFor: (muscle: Muscle) => Contribution[];
};

// Sticky weekly-volume bar. It renders straight from the engine result, so it is always in sync
// with the board. The popover is positioned against the sticky header, outside the scroller.
export function VolumeBar({ volume, contributionsFor }: Props) {
  const [selected, setSelected] = useState<Muscle | null>(null);
  const popoverId = useId();
  const close = useCallback(() => setSelected(null), []);
  const entries = Object.entries(volume.summary) as [Muscle, NonNullable<VolumeSummary['summary'][Muscle]>][];
  const open = selected ? volume.summary[selected] : undefined;

  return (
    <div role="region" aria-label="Weekly volume by muscle" data-testid="volume-bar">
      {entries.length === 0 ? (
        <p className="py-1 text-xs text-slate-600">Weekly volume per muscle appears here once you add muscle groups.</p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto py-1">
          {entries.map(([muscle, entry]) => (
            <li key={muscle} className="shrink-0">
              <VolumeChip
                muscle={muscle}
                entry={entry}
                expanded={selected === muscle}
                controlsId={popoverId}
                onToggle={() => setSelected(selected === muscle ? null : muscle)}
              />
            </li>
          ))}
        </ul>
      )}
      {selected && open && (
        <VolumeDetailPopover id={popoverId} muscle={selected} entry={open} contributions={contributionsFor(selected)} onClose={close} />
      )}
    </div>
  );
}
