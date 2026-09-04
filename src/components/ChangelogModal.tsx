import React, { useEffect } from 'react';
import { ExternalLink, PartyPopper, X } from 'lucide-react';
import { ReleaseNote, resolveNoteUrl } from '@/releaseNotes';

interface ChangelogModalProps {
    note: ReleaseNote;
    onClose: () => void;
}

export default function ChangelogModal({ note, onClose }: ChangelogModalProps) {
    // Esc 鍵關閉
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const url = resolveNoteUrl(note);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="card flex w-full max-w-md flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between bg-[var(--surface-subtle)] px-6 py-5">
                    <div>
                        <div className="mono-label text-[var(--ink-3)]">Release notes . what's new</div>
                        <h2 className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-[var(--ink-1)]">
                            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--r-2)] bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--ink-2)]">
                                <PartyPopper className="h-3.5 w-3.5" />
                            </span>
                            TolMaster 已更新至 v{note.version}
                        </h2>
                        <p className="mt-1 text-[12px] text-[var(--ink-2)]">{note.date}</p>
                        {url && (
                            <p className="mt-2 text-[12.5px] text-[var(--ink-2)]">
                                本次更新的完整說明請見改版公告。
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="iconbtn ghost">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface)] p-6">
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--primary"
                        >
                            查看完整改版公告
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                    <button onClick={onClose} className="btn btn--secondary">
                        知道了
                    </button>
                </div>
            </div>
        </div>
    );
}
