"use client";

import { useMemo } from "react";
import { formatCoord, formatKm, haversineKm } from "@/lib/geo";
import { portTitle } from "@/lib/port";
import type { LatLon, Port, Shop } from "@/lib/types";

interface Props {
  shop: Shop;
  ports: Port[];
  me: LatLon | null;
  onClose: () => void;
  onSelectPort: (p: Port) => void;
}

function shopMapsUrl(shop: Shop): string {
  const q = new URLSearchParams({ api: "1" });
  q.set("query", `${shop.n} ${shop.a}`);
  if (shop.gid) q.set("query_place_id", shop.gid);
  return `https://www.google.com/maps/search/?${q.toString()}`;
}

export default function ShopDetail({ shop, ports, me, onClose, onSelectPort }: Props) {
  const nearest = useMemo(() => {
    const here = { lat: shop.la, lon: shop.lo };
    return ports
      .map((p) => ({ p, d: haversineKm(here, { lat: p.la, lon: p.lo }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [ports, shop.la, shop.lo]);

  const distance = me ? haversineKm(me, { lat: shop.la, lon: shop.lo }) : null;

  return (
    <div className="h-full flex flex-col bg-paper-2">
      <header className="shrink-0 border-b border-ink/15 bg-paper-2 px-4 pt-3 pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9.5px] tracking-wider px-1 py-[1px] rounded-[1px] font-semibold bg-shop text-paper-2">
                釣具店
              </span>
              {shop.p && <span className="text-[10px] text-ink-3">{shop.p}</span>}
            </div>
            <h2 className="mt-1 font-display text-[22px] leading-tight tracking-tight break-words">
              {shop.n}
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-ink-3">
              <span className="num">{formatCoord(shop.la, shop.lo)}</span>
              {distance != null && (
                <>
                  <span>·</span>
                  <span className="num text-ink-2">直線 {formatKm(distance)}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 -mr-1 -mt-1 p-1.5 text-ink-3 hover:text-ink transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <a
          href={shopMapsUrl(shop)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 border border-shop text-shop bg-shop/[0.05] text-[12px] rounded-[2px] hover:bg-shop hover:text-paper-2 transition-colors"
        >
          Google マップで開く
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 9L9 3M9 3H4.5M9 3v4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </a>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-5">
        <section aria-labelledby="shop-info">
          <div className="flex items-center gap-2">
            <h3 id="shop-info" className="eyebrow">店舗情報</h3>
            <span className="flex-1 h-px bg-rule" />
          </div>
          <dl className="mt-2 grid grid-cols-[56px_1fr] gap-x-3 gap-y-2 text-[11.5px]">
            <dt className="text-ink-3">住所</dt>
            <dd className="leading-relaxed">{shop.a}</dd>
            <dt className="text-ink-3">都道府県</dt>
            <dd>{shop.p || "—"}</dd>
            <dt className="text-ink-3">座標</dt>
            <dd className="num">{formatCoord(shop.la, shop.lo)}</dd>
          </dl>
        </section>

        <section aria-labelledby="shop-near">
          <div className="flex items-center gap-2">
            <h3 id="shop-near" className="eyebrow">近くの漁港・港湾</h3>
            <span className="flex-1 h-px bg-rule" />
          </div>
          <ul className="mt-1 divide-y divide-rule/60">
            {nearest.map(({ p, d }) => (
              <li key={p.i}>
                <button
                  type="button"
                  onClick={() => onSelectPort(p)}
                  className="w-full flex items-center gap-2 py-2 text-left hover:bg-paper/70 transition-colors"
                >
                  <span
                    className={[
                      "shrink-0 w-[7px] h-[7px]",
                      p.k === "h" ? "bg-harbor rounded-[2px]" : "bg-port rounded-full",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-[13.5px] truncate block">{portTitle(p)}</span>
                    <span className="text-[10px] text-ink-3">
                      {p.p} ・ {p.t}
                    </span>
                  </span>
                  <span className="num text-[10.5px] text-ink-2 shrink-0">{formatKm(d)}</span>
                  <svg width="9" height="9" viewBox="0 0 12 12" className="text-ink-3 shrink-0" aria-hidden="true">
                    <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[10px] leading-relaxed text-ink-3 border-t border-rule/70 pt-2">
          店舗情報は提供された CSV（{shop.i}）にもとづく基本情報です。営業時間・在庫・電話番号は
          各店舗の公式情報をご確認ください。
        </p>
      </div>
    </div>
  );
}
