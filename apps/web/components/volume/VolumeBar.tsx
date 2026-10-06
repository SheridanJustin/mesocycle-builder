'use client';

import type { GroupVolumeSummary, MuscleGroup } from '@mesocycle/shared';
import { useCallback, useId, useState } from 'react';
import type { Contribution } from '../../lib/builder/volume';
import { LandmarkInfo } from './LandmarkInfo';
import { VolumeChip } from './VolumeChip';
import { VolumeDetailPopover } from './VolumeDetailPopover';

type Props = {
  volume: GroupVolumeSummary;
  contributionsFor: (group: MuscleGroup) => Contribution[];
};

// Sticky weekly-volume bar, one chip per major muscle group. It renders straight from the engine
// result, so it is always in sync with the board. The popover is positioned against the sticky
// header, outside the scroller.
export function VolumeBar({ volume, contributionsFor }: Props) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const popoverId = useId();
  const close = useCallback(() => setSelected(null), []);
  const entries = Object.entries(volume.summary) as [MuscleGroup, NonNullable<GroupVolumeSummary['summary'][MuscleGroup]>][];
  const open = selected ? volume.summary[selected] : undefined;

  return (
    <div role="region" aria-label="Weekly volume by muscle group" data-testid="volume-bar" className="flex items-center gap-2 py-1.5">
      {entries.length === 0 ? (
        <p className="flex-1 py-1 text-xs text-graphite-500">Weekly sets per muscle group appear here as you add exercises.</p>
      ) : (
        // Ten groups at most, so they always fit: no horizontal scrolling.
        <ul className="grid flex-1 grid-cols-5 gap-1.5 lg:grid-cols-10">
          {entries.map(([group, entry]) => (
            <li key={group} className="min-w-0">
              <VolumeChip
                group={group}
                entry={entry}
                expanded={selected === group}
                controlsId={popoverId}
                onToggle={() => setSelected(selected === group ? null : group)}
              />
            </li>
          ))}
        </ul>
      )}
      <LandmarkInfo />
      {selected && open && (
        <VolumeDetailPopover id={popoverId} group={selected} entry={open} contributions={contributionsFor(selected)} onClose={close} />
      )}
    </div>
  );
}
