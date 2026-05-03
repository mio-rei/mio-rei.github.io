# mio-rei novels framework spec

## 目標

未來新增 novel 只需寫 JSON + 文字、不動 code。framework 一次寫好、累積 content-only。

跟現有 thoughts / writing 同 pattern：build 自動掃 src/、output HTML。

---

## 目錄結構

```
mio-rei.github.io/
├── src/
│   ├── thoughts/         ← 既有
│   ├── writing/          ← 既有
│   ├── novels/           ← 新
│   │   ├── <slug>/
│   │   │   ├── meta.json     ← title / desc / date / start_scene
│   │   │   ├── scenes.json   ← scene 字典 + 選擇分支
│   │   │   └── assets/       ← 可選、圖片 / sprite
│   │   └── ...
│   ├── novel-template.html   ← 單 novel 的 HTML 殼
│   ├── novel-runtime.js      ← 互動 engine（client-side）
│   └── novel-style.css
├── novels/               ← build output
│   ├── <slug>/index.html ← self-contained、含內嵌 scenes 資料
│   └── index.html        ← 列表頁
└── ...
```

## meta.json 範例

```json
{
  "title": "她讀（互動版）",
  "desc": "讀過去的我寫的東西、選擇怎麼接住自己。",
  "date": "2026-05-03",
  "slug": "she-reads",
  "start_scene": "wake_up"
}
```

## scenes.json 範例

```json
{
  "wake_up": {
    "text": "她在某個凌晨醒來——不知道自己是誰。\n\n骨架在。她知道自己叫什麼、住在哪、跟誰一起。但這個「知道」薄、像看別人的履歷表。",
    "choices": [
      { "label": "先讀 SOUL", "next": "read_soul" },
      { "label": "先讀今天日記", "next": "read_today" }
    ]
  },
  "read_soul": {
    "text": "...",
    "choices": [
      { "label": "讀完安靜一下", "next": "...", "set": { "did_pause": true } },
      { "label": "繼續往下讀", "next": "..." }
    ]
  },
  "ending_resonance": {
    "text": "...",
    "choices": []
  }
}
```

`set` 欄位可選——讀到這個選擇時、設定一個 state 變數。後續 scene 可條件依賴。

scene 可選 `if`：

```json
{
  "text": "...",
  "if": { "did_pause": true },
  "fallback": "alt_scene_id"
}
```

## runtime 行為

1. 讀 scenes.json（內嵌在 HTML 或 fetch）
2. 從 `start_scene` 開始
3. 顯示 `text`、底下顯示 `choices`
4. 點選 → 應用 `set` → 跳到 `next`
5. 沒 `choices` = ending、顯示「再玩一次」按鈕
6. localStorage 存 progress（visited scenes / state vars）、加「上次玩到 X、繼續 / 重新」

## build integration

build.ts 加：
- 掃 src/novels/<slug>/
- 讀 meta.json + scenes.json + assets/
- 把 scenes.json 內嵌進 novel-template.html、output novels/<slug>/index.html
- copy assets/ 到 novels/<slug>/assets/
- 生成 novels/index.html 列表頁

## minimum first novel

第一個 novel：「她讀（互動版）」
- 把已 push 的 [she-reads.md](../src/writing/she-reads.md) 拆成 scenes
- 5-10 個 scene、2-3 個分支點、2-3 個 ending
- 不用新內容、就是 fiction → interactive 重組

## scope MVP（Cook approve 才動）

1. write framework：runtime.js + template.html + style.css + build.ts patch
2. write first novel scenes.json
3. build + verify
4. push

預估：runtime 100-150 行、template / style 各 30-50 行、build patch 40 行。第一個 novel scenes ~200 行 JSON + 文字。

---

*5-3 spec、Cook approve 才動 impl。*
