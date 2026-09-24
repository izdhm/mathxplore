/**
 * SolutionPanel - the answer, on request.
 *
 * Hints stop short of the answer on purpose; this is where the answer lives
 * when a student has genuinely reached the end of them. It unlocks after the
 * hints have been read (challenges) or after a first attempt (lessons), and
 * revealing it is recorded in the learning log, so a solved item that was
 * solved from the answer key is never mistaken for one solved unaided.
 */

import { useEffect, useState } from 'react';
import { CodeEditor } from '../code/CodeEditor';
import { Button, Panel, PanelHeader } from '../ui/Primitives';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';

interface Props {
  /** Identifies the item, so that switching items hides the previous answer. */
  itemId: string;
  code: string;
  unlocked: boolean;
  /** Why it is still locked - shown as a tooltip on the disabled button. */
  lockedHint: string;
  onReveal: () => void;
  /** Loads the solution into the student's editor. */
  onUse: (code: string) => void;
}

export function SolutionPanel({ itemId, code, unlocked, lockedHint, onReveal, onUse }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [itemId]);

  const reveal = () => {
    if (!unlocked || revealed) return;
    setRevealed(true);
    onReveal();
  };

  return (
    <Panel>
      <PanelHeader
        title="Solution"
        icon="key"
        domain="spark"
        info="One correct answer - there are usually others. It unlocks once the hints have been read, and looking at it is noted in your record."
        right={
          revealed ? (
            <Button onClick={() => onUse(code)} className="px-3 py-1.5 text-[12px]">
              <Icon name="upload" size={13} />
              Use it
            </Button>
          ) : (
            <Tooltip label={unlocked ? 'Show the answer' : lockedHint}>
              <span>
                <Button onClick={reveal} disabled={!unlocked} className="px-3 py-1.5 text-[12px]">
                  <Icon name={unlocked ? 'eye' : 'key'} size={13} />
                  Reveal
                </Button>
              </span>
            </Tooltip>
          )
        }
      />
      {revealed && (
        <div className="p-3 animate-rise">
          <CodeEditor value={code} onChange={() => {}} readOnly minRows={Math.min(12, code.split('\n').length + 1)} ariaLabel="Solution code" />
        </div>
      )}
    </Panel>
  );
}
