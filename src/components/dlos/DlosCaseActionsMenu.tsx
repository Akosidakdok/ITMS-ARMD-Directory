import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const actions = [
  ['view', 'View details'],
  ['refer_case', 'Refer case'],
  ['updates', 'Case updates'],
  ['sho', 'Change assigned SHO'],
  ['record_sho_received', 'Record SHO receipt'],
  ['respondents', 'Manage respondents'],
  ['upload', 'Upload transmittal/PCE']
] as const;

interface Props {
  docketNumber: string;
  canWrite: boolean;
  onView: () => void;
  onAction: (action: string) => void;
}

export const DlosCaseActionsMenu = ({ docketNumber, canWrite, onView, onAction }: Props) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleActions = canWrite ? actions : actions.slice(0, 1);

  const showMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(220, rect.width);
    const menuHeight = visibleActions.length * 37 + 12;
    setPosition({
      top: rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnScroll = (event: Event) => { if (!(event.target instanceof Node) || !menuRef.current?.contains(event.target)) setOpen(false); };
    const closeOnResize = () => setOpen(false);
    document.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnResize);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  const select = (action: string) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (action === 'view') onView();
    else onAction(action);
  };

  return <>
    <button ref={triggerRef} type="button" className="dlos-actions-trigger" aria-label={`Actions for ${docketNumber}`} aria-haspopup="menu" aria-expanded={open}
      onClick={() => open ? setOpen(false) : showMenu()} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); showMenu(); } }}>
      Actions <ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={menuRef} role="menu" aria-label={`Actions for ${docketNumber}`} className="dlos-actions-menu" style={position}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') || []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
        }
        if (event.key === 'Home') { event.preventDefault(); menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
        if (event.key === 'End') { event.preventDefault(); menuRef.current?.querySelector<HTMLButtonElement>('button:last-child')?.focus(); }
      }}>
      {visibleActions.map(([action, label]) => <button key={action} type="button" role="menuitem" onClick={() => select(action)}>{label}</button>)}
    </div>, document.body)}
  </>;
};
