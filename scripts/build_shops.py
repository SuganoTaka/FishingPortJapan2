#!/usr/bin/env python3
"""
釣具店 CSV（places_fishing_shops_jp.csv）から地図用の JSON を生成する。

入力: data/source/places_fishing_shops_jp.csv
  columns: place_id, name, address, lat, lng, business_status
出力: public/data/shops.json

使い方:
  python3 scripts/build_shops.py
"""

from __future__ import annotations

import csv
import json
import os
import re
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "source", "places_fishing_shops_jp.csv")
OUT = os.path.join(ROOT, "public", "data", "shops.json")

PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
]

POSTAL = re.compile(r"^〒\s*\d{3}\s*-?\s*\d{4}\s*")
JP_PREFIX = re.compile(r"^(日本|Japan)\s*[、,]?\s*")


def clean_address(addr: str) -> str:
    a = (addr or "").strip()
    a = JP_PREFIX.sub("", a)
    a = POSTAL.sub("", a)
    return a.strip()


def pref_of(addr: str) -> str:
    """都道府県名が住所のどこにあっても拾う（英語順の住所にも対応）"""
    best = None
    for p in PREFECTURES:
        i = addr.find(p)
        if i >= 0 and (best is None or i < best[0]):
            best = (i, p)
    return best[1] if best else ""


def main() -> None:
    if not os.path.exists(SRC):
        raise SystemExit(f"CSV が見つかりません: {SRC}")

    shops = []
    seen = set()
    skipped = 0

    with open(SRC, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            pid = (row.get("place_id") or "").strip()
            name = (row.get("name") or "").strip()
            addr = clean_address(row.get("address") or "")
            try:
                lat = float(row.get("lat") or "")
                lon = float(row.get("lng") or "")
            except ValueError:
                skipped += 1
                continue
            if not name or not pid or pid in seen:
                skipped += 1
                continue
            if not (20.0 < lat < 47.5 and 122.0 < lon < 154.5):
                skipped += 1
                continue
            seen.add(pid)
            shops.append({
                "i": f"S{len(shops) + 1:05d}",
                "n": name,
                "a": addr,
                "p": pref_of(addr),
                "la": round(lat, 6),
                "lo": round(lon, 6),
                "gid": pid,
            })

    shops.sort(key=lambda s: (s["p"], s["n"]))
    for idx, s in enumerate(shops, start=1):
        s["i"] = f"S{idx:05d}"

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "釣具店一覧（ユーザー提供 CSV / place_id・座標付き）",
        "count": len(shops),
        "shops": shops,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size = os.path.getsize(OUT)
    by_pref: dict[str, int] = {}
    for s in shops:
        by_pref[s["p"]] = by_pref.get(s["p"], 0) + 1

    print(f"wrote {OUT}  {size / 1024:.0f} KB")
    print(f"shops: {len(shops)} (skipped {skipped})")
    print("pref unknown:", by_pref.get("", 0))
    top = sorted(by_pref.items(), key=lambda kv: -kv[1])[:5]
    print("top prefs:", ", ".join(f"{k or '不明'}:{v}" for k, v in top))


if __name__ == "__main__":
    main()
