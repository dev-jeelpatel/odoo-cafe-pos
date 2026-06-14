'use client';
import Modal from '@/components/ui/Modal';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
      {children}
    </kbd>
  );
}

const SHORTCUTS: { keys: React.ReactNode; label: string }[] = [
  { keys: <Kbd>/</Kbd>, label: 'Focus product search' },
  { keys: <Kbd>Esc</Kbd>, label: 'Clear search' },
  { keys: <span className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>1</Kbd>..<Kbd>9</Kbd></span>, label: 'Switch category tab' },
  { keys: <span className="flex items-center gap-1"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd></span>, label: 'Open payment / Charge' },
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-3">
        {SHORTCUTS.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{s.label}</span>
            {s.keys}
          </div>
        ))}
      </div>
    </Modal>
  );
}
