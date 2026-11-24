#!/usr/bin/env python3
"""
潮見帖（FishingPort / tsuriko-chart）の仕様書を Excel で生成する。

出力: docs/潮見帖_仕様書.xlsx
使い方: python3 scripts/build_spec_xlsx.py
"""

from __future__ import annotations

import os
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "潮見帖_仕様書.xlsx")

INK = "0E2A33"
TEAL = "14606B"
PAPER = "F6F7F1"
RULE = "C8D4CD"
SHOP = "694C8A"

TITLE_FONT = Font(name="Yu Gothic", size=16, bold=True, color=INK)
SUB_FONT = Font(name="Yu Gothic", size=10, color="3C5A62")
HEAD_FONT = Font(name="Yu Gothic", size=10, bold=True, color="FFFFFF")
BODY_FONT = Font(name="Yu Gothic", size=10, color=INK)
MONO_FONT = Font(name="Consolas", size=9, color=INK)

HEAD_FILL = PatternFill("solid", start_color=INK)
SECTION_FILL = PatternFill("solid", start_color=TEAL)
BAND_FILL = PatternFill("solid", start_color=PAPER)

thin = Side(style="thin", color=RULE)
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)


def style_header(ws, row: int, ncols: int, fill=HEAD_FILL):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = HEAD_FONT
        cell.fill = fill
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[row].height = 26


def write_table(ws, start_row: int, header: list[str], rows: list[list], widths: list[int], start_col: int = 1):
    for i, h in enumerate(header, start=start_col):
        ws.cell(row=start_row, column=i, value=h)
    for c in range(start_col, start_col + len(header)):
        cell = ws.cell(row=start_row, column=c)
        cell.font = HEAD_FONT
        cell.fill = HEAD_FILL
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[start_row].height = 26

    for r, values in enumerate(rows, start=start_row + 1):
        for c, v in enumerate(values, start=start_col):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = BODY_FONT
            cell.alignment = WRAP
            cell.border = BORDER
            if (r - start_row) % 2 == 0:
                cell.fill = BAND_FILL

    for i, w in enumerate(widths, start=start_col):
        ws.column_dimensions[get_column_letter(i)].width = w

    # 折り返し行の高さを文字数から見積もる（openpyxl は自動調整しないため）
    import math

    for r, values in enumerate(rows, start=start_row + 1):
        lines = 1
        for i, v in enumerate(values, start=start_col):
            width = widths[i - start_col] if i - start_col < len(widths) else 20
            per_line = max(6.0, (width - 1) / 2.0)
            text = str(v) if v is not None else ""
            est = 0
            for part in text.split("\n"):
                est += max(1, math.ceil(len(part) / per_line))
            lines = max(lines, est)
        ws.row_dimensions[r].height = min(90, max(17, lines * 15 + 3))

    ws.freeze_panes = ws.cell(row=start_row + 1, column=start_col)
    first = get_column_letter(start_col)
    last = get_column_letter(start_col + len(header) - 1)
    ws.auto_filter.ref = f"{first}{start_row}:{last}{start_row + len(rows)}"
    ws.sheet_view.showGridLines = False
    return start_row + len(rows)


def sheet_cover(wb: Workbook):
    ws = wb.active
    ws.title = "表紙"
    ws.sheet_view.showGridLines = False
    widths = [3, 22, 12, 46, 14]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws["B2"] = "潮見帖（しおみちょう）"
    ws["B2"].font = TITLE_FONT
    ws["B3"] = "全国の漁港・港湾・釣具店の釣り情報マップ ／ 仕様書"
    ws["B3"].font = SUB_FONT

    info = [
        ("文書番号", "SHIOMI-SPEC-001"),
        ("版数", "1.0"),
        ("作成日", date.today().isoformat()),
        ("対象システム", "潮見帖 / FishingPort（tsuriko-chart）"),
        ("公開URL", "https://tsuriko-chart-gkms.onrender.com"),
        ("リポジトリ", "GitHub: FishingPortJapan"),
        ("ホスティング", "Render.com（Blueprint / Node 22）"),
        ("データ出典", "国土数値情報（国土交通省）、国土地理院、Open-Meteo、気象庁、提供CSV"),
        ("作成方法", "実装済みシステムからの逆起こし"),
    ]
    row = 5
    for k, v in info:
        ws.cell(row=row, column=2, value=k).font = Font(name="Yu Gothic", size=10, bold=True, color=INK)
        ws.cell(row=row, column=2).fill = PatternFill("solid", start_color=PAPER)
        ws.cell(row=row, column=2).border = BORDER
        c = ws.cell(row=row, column=3, value=v)
        c.font = BODY_FONT
        c.alignment = WRAP
        c.border = BORDER
        ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=5)
        row += 1

    row += 1
    ws.cell(row=row, column=2, value="改訂履歴").font = Font(name="Yu Gothic", size=11, bold=True, color=TEAL)
    row += 1
    write_table(
        ws,
        row,
        ["版", "日付", "変更内容", "担当"],
        [
            ["1.0", date.today().isoformat(), "初版（実装済み機能の仕様化）", "—"],
        ],
        [22, 12, 46, 14],
        start_col=2,
    )
    # 表紙のテーブルは B 列始まりのため、列幅を合わせて調整
    return ws


def sheet_overview(wb: Workbook):
    ws = wb.create_sheet("1.概要")
    rows = [
        [
            "目的",
            "全国の漁港・港湾を地図から探し、その港で「今の時期に釣れる魚」・天気/風/波・タイドグラフ・現在地からの距離とルートを1画面で確認できるようにする。船釣りは対象外（陸っぱり＝港内・堤防・岸壁）。",
        ],
        [
            "対象利用者",
            "堤防・港内釣りを楽しむ一般利用者。PC/スマートフォンのブラウザから利用。ログイン不要。",
        ],
        [
            "提供価値",
            "①港選び（地図・検索・距離） ②釣行可否の判断（風・波・潮・天気） ③何が釣れるか（季節カレンダー） ④店舗（釣具店）の探索 ⑤予報アプリ（WindTide）への導線",
        ],
        [
            "スコープ内",
            "港・港湾・釣具店の地図表示／港詳細（魚・気象・潮位・アクセス・施設情報）／店舗詳細／検索・絞り込み／現在地／Google マップ連携／WindTide 連携",
        ],
        [
            "スコープ外",
            "船釣り・釣果投稿・ユーザー登録・決済・ルート案内の音声ナビ・魚の図鑑画像",
        ],
        [
            "前提・依存",
            "外部API（Open-Meteo、OSRM、気象庁、Google Maps は任意）へ HTTPS 接続できること。位置情報は HTTPS 必須。",
        ],
        [
            "システム構成",
            "Next.js 15（App Router）+ TypeScript + Tailwind CSS。サーバー機能は API Routes（/api/weather, /api/route, /api/fish）。地図は Leaflet（国土地理院タイル）または Google Maps。",
        ],
    ]
    write_table(ws, 1, ["項目", "内容"], rows, [20, 110])
    for r in range(2, 2 + len(rows)):
        ws.row_dimensions[r].height = 54 if r in (2, 5) else 40
    return ws


def sheet_functions(wb: Workbook):
    ws = wb.create_sheet("2.機能一覧")
    rows = [
        ["F-01", "全国マーカー表示", "漁港2,931・港湾994・釣具店2,638を地図に表示。ズームに応じてクラスタ化（46pxグリッド、zoom14以上で解除）。", "地図", "実装済"],
        ["F-02", "マーカー種別", "漁港＝丸（青緑）／港湾＝四角（橙）／釣具店＝ひし形（マゼンタ）。白フチ＋影で地図上での視認性を確保。選択中は赤で拡大。", "地図", "実装済"],
        ["F-03", "地図レイヤ切替", "国土地理院タイルの 淡色／標準／写真 を切替。Google キー設定時は Google マップ（標準/航空写真）。", "地図", "実装済"],
        ["F-04", "検索", "港名・都道府県・管理者・コード、釣具店名・住所を部分一致で検索（空白無視・小文字化）。", "左レール", "実装済"],
        ["F-05", "絞り込み", "すべて／漁港／港湾／釣具店、都道府県、漁港・港湾の種別（第1〜5種・港湾種別）。", "左レール", "実装済"],
        ["F-06", "距離順ソート", "現在地取得後、直線距離の近い順に並べ替え（港・店舗の混在リストに対応）。", "左レール", "実装済"],
        ["F-07", "現在地", "Geolocation API で取得。地図に現在地マーカー、距離表示、地図を現在地へ移動。拒否・失敗時はメッセージ表示。", "ヘッダ/左レール", "実装済"],
        ["F-08", "釣れる魚（季節）", "港の地域×選択月で釣れる魚を評価順に表示。最盛期バッジ、釣り方・エサ・仕掛け・コツ・注意を展開表示。1〜12月に切替可。", "港詳細", "実装済"],
        ["F-09", "天気・風・波", "現在の気温・天気・風向風速・突風・波高・水温・気圧・湿度、7日間の週間予報、日の出/日の入り。", "港詳細", "実装済"],
        ["F-10", "タイドグラフ", "48時間の潮位曲線、満潮/干潮（時刻・潮位）、現在時刻線、潮回り（大潮〜若潮）、月齢・月相、潮位差。", "港詳細", "実装済"],
        ["F-11", "アクセス", "現在地からの直線距離と車ルート（距離・所要時間）。ルートを地図に描画。Google マップ経路リンク。経路取得失敗時は直線×1.3の概算。", "港詳細", "実装済"],
        ["F-12", "施設情報", "漁港/港湾コード、管理者、指定年月日、外郭施設延長、係留施設延長、定期航路（港湾）。", "港詳細", "実装済"],
        ["F-13", "店舗詳細", "釣具店の住所・都道府県・座標・現在地からの距離、Google マップで開く（place_id）、近くの港3件（遷移可）。", "店舗詳細", "実装済"],
        ["F-14", "共有URL", "選択中の港/店舗をクエリに反映（?p=港ID / ?s=店舗ID）。URLを開くと同地点を選択状態で表示。", "全体", "実装済"],
        ["F-15", "WindTide 連携", "港詳細のボタンでモーダルを開き、WindTide の /embed を iframe 表示。別タブリンクあり。URL未設定時は非表示。", "港詳細", "実装済"],
        ["F-16", "魚データ運用", "Google スプレッドシート（CSV）を唯一の編集元として魚種を追加・削除。取得失敗時は同梱JSONにフォールバック。", "サーバー", "実装済"],
        ["F-17", "レスポンシブ", "デスクトップは左レール＋右パネル、モバイルは一覧オーバーレイ＋ボトムシート。", "全体", "実装済"],
        ["F-18", "アクセシビリティ", "キーボード操作、フォーカス可視化、aria 属性、ESCでモーダル閉、動きの抑制（prefers-reduced-motion）。", "全体", "実装済"],
    ]
    write_table(ws, 1, ["ID", "機能名", "概要", "対象画面", "状況"], rows, [8, 20, 88, 14, 10])
    return ws


def sheet_screens(wb: Workbook):
    ws = wb.create_sheet("3.画面一覧")
    rows = [
        ["SCR-01", "メイン（地図）", "ヘッダ（ロゴ・件数・今月・現在地）、左レール、地図、右パネル", "マーカークリックで選択、地図ドラッグ/ズーム、レイヤ切替", "/"],
        ["SCR-02", "左レール（一覧）", "検索、種別タブ、都道府県/種別セレクト、件数、近い順、現在地、リスト（70件ずつ追加読込）", "行クリックで選択、スクロールで追加読込", "（SPは一覧ボタンで全画面）"],
        ["SCR-03", "港詳細", "港名・種別・所在地・座標・距離、WindTideボタン、釣れる魚、潮と天気、アクセス、施設情報、出典", "月切替、種の展開、ルート表示、再計算、現在地取得", "?p=港ID"],
        ["SCR-04", "店舗詳細", "店名・都道府県・座標・距離、Googleマップ、店舗情報、近くの港3件", "近くの港をクリックで港詳細へ", "?s=店舗ID"],
        ["SCR-05", "WindTide モーダル", "港名、別タブで開く、閉じる、iframe（WindTide /embed）", "ESC/背景クリック/×で閉じる", "（埋め込み）"],
        ["SCR-06", "位置情報エラー", "画面上部の通知（許可拒否・取得失敗）", "×で消す", "—"],
    ]
    write_table(ws, 1, ["画面ID", "画面名", "主な要素", "操作", "URL/備考"], rows, [10, 18, 72, 40, 22])
    return ws


def sheet_data(wb: Workbook):
    ws = wb.create_sheet("4.データ仕様")
    rows = [
        ["D-01", "漁港", "国土数値情報 C09-06（国土交通省・2011年）", 2931,
         "id(kind=F) / 名称 / 都道府県 / 管理者 / 種別(第1〜5種) / 緯度経度 / 漁港コード / 指定年月日 / 外郭施設延長 / 係留施設延長 / 地域ID",
         "scripts/build_ports.py で生成（public/data/ports.json）"],
        ["D-02", "港湾", "国土数値情報 C02-14（国土交通省・2023年）", 994,
         "id(kind=H) / 名称 / 都道府県 / 管理者 / 種別(国際戦略/国際拠点/重要/地方/その他) / 緯度経度 / 港湾コード / 施設延長 / 定期航路 / 地域ID",
         "同上（ports.json に統合）"],
        ["D-03", "釣具店", "提供CSV（place_id / name / address / lat / lng）", 2638,
         "id(S00001〜) / 店名 / 住所（〒除去） / 都道府県（住所から判定） / 緯度経度 / place_id",
         "scripts/build_shops.py で生成（public/data/shops.json）"],
        ["D-04", "魚（季節カレンダー）", "独自データ（Googleスプレッドシート運用可）", 51,
         "id / 名前 / よみ / 別名 / グループ / サイズ / 釣り方 / エサ / 仕掛け / コツ / 注意 / 評価 / 地域別の月・最盛期月",
         "public/data/fish-species.json（正）／シート設定時は /api/fish 経由"],
    ]
    end = write_table(
        ws, 1, ["ID", "データ名", "出典", "件数", "主要項目", "生成・更新方法"], rows, [8, 16, 34, 8, 74, 34]
    )
    total_row = end + 1
    ws.cell(row=total_row, column=2, value="合計").font = Font(name="Yu Gothic", size=10, bold=True, color=INK)
    ws.cell(row=total_row, column=3, value="地図に表示する地点の総数（漁港＋港湾＋釣具店）").font = BODY_FONT
    c = ws.cell(row=total_row, column=4, value="=SUM(D2:D4)")
    c.font = Font(name="Yu Gothic", size=10, bold=True, color=INK)
    for col in range(2, 7):
        ws.cell(row=total_row, column=col).border = BORDER
    ws.cell(row=total_row, column=3).alignment = WRAP

    ws.cell(row=total_row + 2, column=2, value="補足").font = Font(name="Yu Gothic", size=10, bold=True, color=TEAL)
    notes = [
        "・港IDは `F00001`（漁港）/ `H00001`（港湾）、店舗IDは `S00001`。WindTide と共通。",
        "・地域IDは hokkaido / tohoku / kanto / chubu / kinki / chushikoku / kyushu / okinawa の8区分。",
        "・ports.json は約750KB、shops.json は約490KB。いずれも /data/ 配下で1時間キャッシュ配信。",
        "・魚データの「評価」は1〜5。最盛期の月は評価+1（上限5）として表示。",
    ]
    for i, n in enumerate(notes):
        c = ws.cell(row=total_row + 3 + i, column=2, value=n)
        c.font = BODY_FONT
        c.alignment = Alignment(vertical="top")
        ws.merge_cells(start_row=total_row + 3 + i, start_column=2, end_row=total_row + 3 + i, end_column=6)
    return ws


def sheet_api(wb: Workbook):
    ws = wb.create_sheet("5.外部API")
    rows = [
        ["API-01", "天気予報", "https://api.open-meteo.com/v1/forecast",
         "気温・体感・湿度・降水量・降水確率・天気コード・気圧・風速/風向/突風・日の出/日の入り",
         "最大16日（forecast_days）", "サーバー10分キャッシュ", "ブラウザから直接取得にフォールバック"],
        ["API-02", "海洋（潮位・波）", "https://marine-api.open-meteo.com/v1/marine",
         "潮位（sea_level_height_msl）・波高・海面水温（cell_selection=sea）",
         "最大16日", "サーバー10分キャッシュ", "潮位なしの場合は「潮位データなし」表示"],
        ["API-03", "車ルート", "https://router.project-osrm.org/route/v1/driving",
         "距離・所要時間・経路GeoJSON", "デモサーバー（本番用途は非推奨）", "サーバー10分キャッシュ",
         "直線距離×1.3・40km/h換算で代替表示"],
        ["API-04", "気象庁（任意）", "https://www.jma.go.jp/bosai/forecast/data/forecast/{府県}.json",
         "府県天気予報・週間天気", "非公式JSON（変更リスク）", "—", "画面側で非表示"],
        ["API-05", "WindTide", "${WINDTIDE_URL}/embed?port=<港ID>&view=week",
         "風予報・タイドグラフ（別アプリの埋め込み）", "WindTide 側の実装に依存", "—", "別タブリンクを用意"],
    ]
    write_table(ws, 1, ["ID", "名称", "エンドポイント", "取得項目", "制約", "キャッシュ", "失敗時の扱い"],
                rows, [8, 16, 44, 48, 28, 18, 34])
    return ws


def sheet_logic(wb: Workbook):
    ws = wb.create_sheet("6.計算・判定ロジック")
    rows = [
        ["L-01", "距離（直線）", "ヒュベニ／ハバサイン式（地球半径 6371.0088km）。港・店舗・現在地間の直線距離に使用。", "lib/geo.ts"],
        ["L-02", "風向の16方位", "度→16方位（北・北北東…）。矢印は「風が吹いていく向き」＝度+180。", "lib/wind.ts"],
        ["L-03", "風の強弱区分", "0-2 ほぼ無風／2-4 微風／4-6 弱い／6-9 やや強い／9-12 強い／12-15 かなり強い／15以上 危険", "lib/wind.ts"],
        ["L-04", "満潮・干潮の抽出", "1時間値の極値を検出し、3点放物線補間で時刻を±30分以内に補正。", "lib/tide.ts"],
        ["L-05", "月齢", "朔（2000-01-06 18:14 UTC）からの経過日数 mod 29.530588853。", "lib/tide.ts"],
        ["L-06", "月相", "月齢から 新月/三日月/上弦/十三夜/満月/十八夜/下弦/有明月/晦日月 を判定。", "lib/tide.ts"],
        ["L-07", "潮回り", "月齢で判定：0-2 大潮／3-7 中潮／8-10 小潮／11-13 中潮／14-16 大潮／17-20 中潮／21-24 小潮／25-26 長潮／27-28 若潮／29 中潮", "lib/tide.ts"],
        ["L-08", "釣れる魚の判定", "港の地域IDと選択月で season に含まれる種を抽出。peak に含まれる月は評価+1（上限5）。並びは評価→最盛期→グループ→かな。", "lib/fish.ts"],
        ["L-09", "マーカーのクラスタ", "画面46pxのグリッドで集約（zoom14以上はクラスタ解除）。同一セル内の地点を件数バッジに置換。", "lib/cluster.ts"],
        ["L-10", "魚データの正規化", "シートの地域セル「7,8*,9」形式（*＝最盛期、5-9 の範囲指定可）を月配列に変換。空欄はその地域で非表示。", "lib/fish-sheet.ts"],
    ]
    write_table(ws, 1, ["ID", "名称", "仕様", "実装"], rows, [8, 22, 96, 26])
    return ws


def sheet_settings(wb: Workbook):
    ws = wb.create_sheet("7.設定・環境変数")
    rows = [
        ["GOOGLE_MAPS_API_KEY", "任意", "（空）", "設定すると Google マップ表示に切替（Maps JavaScript API の有効化と課金が必要）。未設定は国土地理院タイル。", "サーバー（実行時）"],
        ["GOOGLE_MAPS_MAP_ID", "任意", "DEMO_MAP_ID", "Google の AdvancedMarkerElement 用 Map ID。", "サーバー（実行時）"],
        ["WINDTIDE_URL", "任意", "（空）", "設定すると港詳細に WindTide ボタンを表示。例: https://windtide.onrender.com（末尾スラッシュ不要）。", "サーバー（実行時）"],
        ["NEXT_PUBLIC_WINDTIDE_URL", "任意", "（空）", "上記のビルド時埋め込み版（後方互換）。", "ビルド時"],
        ["FISH_SHEET_ID", "任意", "（空）", "魚データを Google スプレッドシートで管理する場合のシートID。未設定は同梱JSON。", "サーバー（実行時）"],
        ["FISH_SHEET_NAME", "任意", "（空）", "対象タブ名（既定は最初のシート）。", "サーバー（実行時）"],
        ["FISH_SHEET_GID", "任意", "（空）", "タブ名の代わりに gid 指定。", "サーバー（実行時）"],
        ["HTTPS_PROXY ほか", "任意", "（空）", "外向き通信にプロキシが必要な環境で使用（未設定なら直接接続）。", "サーバー（実行時）"],
        ["NODE_VERSION", "任意", "22", "Render の Node バージョン。", "ビルド"],
    ]
    write_table(ws, 1, ["変数名", "必須", "既定値", "用途", "読込タイミング"], rows, [30, 8, 18, 90, 18])
    for r in range(2, 2 + len(rows)):
        ws.cell(row=r, column=1).font = MONO_FONT
    return ws


def sheet_nonfunc(wb: Workbook):
    ws = wb.create_sheet("8.非機能要件")
    rows = [
        ["性能", "初回表示は 2.5 秒以内を目標。港・店舗データは gzip 配信＋Cache-Control（max-age=3600, SWR=86400）。"],
        ["外部API節約", "サーバー側で10分キャッシュ。取得は AbortController で中断可能。同一地点の連打を抑止。"],
        ["可用性", "天気API失敗時はブラウザから直接取得。魚データ失敗時は同梱JSON。経路失敗時は概算表示。画面は空にしない。"],
        ["タイムゾーン", "表示・計算はすべて日本時間（Asia/Tokyo）。"],
        ["対応ブラウザ", "Chrome / Edge / Safari 最新、iOS Safari。位置情報は HTTPS 必須。"],
        ["レスポンシブ", "幅390px（スマートフォン）で全機能を操作可能。右パネルはボトムシート化。"],
        ["アクセシビリティ", "キーボード操作、コントラスト比 4.5:1 以上、色のみに依存しない表示、動きの抑制設定に対応。"],
        ["セキュリティ", "秘密情報は環境変数のみ（リポジトリに含めない）。外部リンクは rel=noopener。iframe は自オリジン外を埋め込むため送信元側の許可設定が必要。"],
        ["保守性", "データは JSON / スプレッドシートで更新可能（コード変更不要）。港データはスクリプトで再生成。"],
        ["免責", "潮位・気象はモデル推算値。釣行判断は海上保安庁の潮汐表・気象庁の海上予報・現地の海況で確認する旨を画面に明記。"],
    ]
    write_table(ws, 1, ["区分", "要件"], rows, [18, 110])
    for r in range(2, 2 + len(rows)):
        ws.row_dimensions[r].height = 40
    return ws


def sheet_constraints(wb: Workbook):
    ws = wb.create_sheet("9.制約・注意事項")
    rows = [
        ["データ鮮度", "漁港データは2011年、港湾データは2023年時点。施設延長・指定日は現況と異なる場合がある。"],
        ["潮位", "Open-Meteo Marine の海洋モデルによる推算値であり、天文潮位表とは差が出る。干満時刻は±10〜30分程度の誤差を想定。"],
        ["風・波", "格子モデルの値。岬や防波堤の陰など微地形の影響は反映されない。"],
        ["経路", "OSRM デモサーバーは可用性が保証されない。継続利用する場合は自前OSRM か商用APIへ切替が必要。"],
        ["釣具店データ", "提供CSVの時点情報。営業時間・電話・在庫は保持していない。閉店・移転は反映されない。"],
        ["魚の季節", "地域別の目安。水温・年により変動する。船釣りは対象外。"],
        ["利用規約", "国土数値情報（出典明記）、国土地理院タイル（出典明記）、Open-Meteo（非商用枠）、気象庁（政府標準利用規約）。"],
        ["漁港でのマナー", "漁業者の作業場所。立入禁止区域・駐車禁止・漁協のルールに従う旨を画面に明記。"],
    ]
    write_table(ws, 1, ["区分", "内容"], rows, [18, 110])
    for r in range(2, 2 + len(rows)):
        ws.row_dimensions[r].height = 40
    return ws


def sheet_future(wb: Workbook):
    ws = wb.create_sheet("10.拡張候補")
    rows = [
        ["お気に入り・履歴", "港/店舗のお気に入り登録と最近見た履歴（localStorage）。", "中"],
        ["印刷/PDF出力", "港の釣り情報をA4に出力（釣行メモとして持参）。", "中"],
        ["気象庁の併記", "海上予報・海上警報・週間天気を港詳細に併記（公式情報の担保）。", "中"],
        ["潮位の月間表示", "16日超の期間は満干時刻を概算表示（実測極値から外挿）。", "低"],
        ["複数港の比較", "2〜3港を並べて風・潮を比較。", "低"],
        ["釣具店の営業情報", "営業時間・電話・定休日をデータ提供元から拡充。", "低"],
        ["多言語化", "英語・繁体字（訪日釣り客向け）。", "低"],
    ]
    write_table(ws, 1, ["項目", "内容", "優先度"], rows, [22, 100, 10])
    return ws


def setup_print(wb: Workbook, repeat_rows: dict[str, int]):
    for ws in wb.worksheets:
        ws.page_setup.orientation = "landscape"
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.print_options.horizontalCentered = True
        ws.page_margins.left = 0.4
        ws.page_margins.right = 0.4
        ws.page_margins.top = 0.6
        ws.page_margins.bottom = 0.6
        ws.oddHeader.right.text = "潮見帖 仕様書 v1.0"
        ws.oddHeader.right.size = 8
        ws.oddHeader.right.color = "6A838A"
        ws.oddFooter.center.text = "&A　—　&P / &N"
        ws.oddFooter.center.size = 8
        ws.oddFooter.center.color = "6A838A"
        row = repeat_rows.get(ws.title)
        if row:
            ws.print_title_rows = f"{row}:{row}"


def main():
    wb = Workbook()
    sheet_cover(wb)
    sheet_overview(wb)
    sheet_functions(wb)
    sheet_screens(wb)
    sheet_data(wb)
    sheet_api(wb)
    sheet_logic(wb)
    sheet_settings(wb)
    sheet_nonfunc(wb)
    sheet_constraints(wb)
    sheet_future(wb)

    setup_print(
        wb,
        {
            "2.機能一覧": 1,
            "3.画面一覧": 1,
            "4.データ仕様": 1,
            "5.外部API": 1,
            "6.計算・判定ロジック": 1,
            "7.設定・環境変数": 1,
        },
    )

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wb.save(OUT)
    print("saved:", OUT, f"{os.path.getsize(OUT) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
