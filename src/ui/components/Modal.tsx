// Shared modal shell. Not exported via the required file list, but used by
// every *Modal.tsx as a private helper. Kept here to avoid duplication.
import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  closable?: boolean;
  wide?: boolean;
}

export default function Modal({ title, children, onClose, closable = true, wide }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className={`bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl text-neutral-100 ${
          wide ? "w-full max-w-3xl" : "w-full max-w-md"
        } max-h-[90vh] overflow-y-auto`}
        role="dialog"
        aria-modal="true"
      >
        {(title || closable) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
            <div className="font-semibold">{title}</div>
            {closable && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white rounded"
                aria-label="Close"
              >
                ✕
              </button>
            ) : null}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
