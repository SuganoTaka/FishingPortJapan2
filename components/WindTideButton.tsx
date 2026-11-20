"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  portId: string;
  portName: string;
  baseUrl: string;
  view?: "week" | "month";
}

export default function WindTideButton({ portId, portName, baseUrl, view = "week" }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const base = baseUrl.replace(/\/+$/, "");
  const q = `p=${encodeURIComponent(portId)}&view=${view}`;
  const embedUrl = `${base}/embed?${q}`;
  const appUrl = `${base}/?${q}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-2.5 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 border border-teal text-teal bg-teal/[0.04] text-[12px] rounded-[2px] hover:bg-teal hover:text-paper-2 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 10.5c1.6 0 1.6-1.6 3.2-1.6s1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6 1.6 1.6 2.4 1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M2 6.2c1.6 0 1.6-1.6 3.2-1.6s1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6S13.2 6.2 14 6.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
        </svg>
        WindTide で風・潮を見る（週間）
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-stretch sm:items-center justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="windtide-title"
        >
          <div
            className="absolute inset-0 bg-ink/45"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-full flex-col border border-ink/25 bg-paper-2 shadow-float sm:h-[90vh] sm:max-w-[1120px]">
            <header className="flex shrink-0 items-center gap-3 border-b border-ink/15 px-3 py-2 sm:px-4">
              <div className="min-w-0 flex-1">
                <h2 id="windtide-title" className="font-display text-[15px] leading-tight truncate">
                  WindTide — {portName}
                </h2>
                <p className="mt-0.5 text-[10px] text-ink-3">
                  風予報とタイドグラフ（週間）。別アプリの画面を表示しています。
                </p>
              </div>
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex shrink-0 items-center gap-1 border border-ink/30 px-2 py-1 text-[11px] hover:border-ink hover:bg-paper transition-colors"
              >
                別タブで開く
                <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 9L9 3M9 3H4.5M9 3v4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </a>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="shrink-0 p-1.5 text-ink-3 hover:text-ink transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <iframe
              src={embedUrl}
              title={`${portName} の風・潮（WindTide）`}
              loading="lazy"
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />

            <div className="flex shrink-0 items-center gap-2 border-t border-rule px-3 py-1.5 sm:hidden">
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center border border-ink/30 px-2 py-1.5 text-[11.5px]"
              >
                別タブで開く
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-ink bg-ink px-2 py-1.5 text-[11.5px] text-paper-2"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
