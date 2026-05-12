# ChaffLamingo

クイックシャッフルでチームをまぜまぜするアプリ。

## 開発

```bash
bun install
bun run dev          # http://localhost:3000
```

Docker で動かす場合は `docker-compose.yml` を参照。

## ディレクトリ構成

```
app/
├── layout.tsx              ルートレイアウト (html/body/フォント)
├── globals.css             Tailwind + CSS変数 (ブランド色など)
└── (main)/                 ★ サイドバー付き共通レイアウトの route group
    ├── layout.tsx          Sidebar + 右ペイン slot
    ├── page.tsx            "/"          クイックシャッフル
    ├── favorites/page.tsx  "/favorites" お気に入り
    ├── members/page.tsx    "/members"   メンバー管理
    └── settings/page.tsx   "/settings"  設定

components/
├── ui/                     ★ 汎用プリミティブ (どの画面でも使う)
│   └── card.tsx
├── layout/                 レイアウト系 (サイドバー、将来ヘッダー)
│   └── sidebar.tsx
└── shuffle/                クイックシャッフル画面ローカルの部品
    ├── types.ts
    ├── table-canvas.tsx
    ├── member-list.tsx
    └── shuffle-controls.tsx

lib/
└── utils.ts                cn() などのヘルパー

public/
├── ui/                     UI 装飾の画像 (knob 等)
├── icons/                  ブランドアイコン (将来)
└── images/                 写真・大きい画像 (将来)
```

## チームメンバー向け開発ガイド

### 担当画面の追加方法

1. `app/(main)/<画面名>/page.tsx` を作る
   - `app/(main)/favorites/page.tsx` をテンプレに
2. 専用部品が要るなら `components/<画面名>/` に作る
   - 命名は kebab-case (`member-list.tsx`)、コンポーネント名は PascalCase
3. サイドバーに増やすなら `components/layout/sidebar.tsx` の
   `TOP_ITEMS` / `BOTTOM_ITEMS` に1行足すだけ

### コンポーネントの置き場所の判断

| 置き場所                       | 何を置く                                             |
| ------------------------------ | ---------------------------------------------------- |
| `components/ui/`               | Button, Input, Card など、どの画面でも使う汎用パーツ |
| `components/layout/`           | Sidebar, Header など、レイアウト構造を担うもの       |
| `components/<画面名>/`         | その画面でしか使わない専用部品                       |
| `app/(main)/<画面名>/page.tsx` | 状態とロジックを持つコンテナ                         |

迷ったら `components/<画面名>/` に置く。3画面以上で使われていることが分かったら `components/ui/` に昇格させる ("Rule of Three")。

### コンテナとプレゼンテーションの分離

`app/(main)/page.tsx` を見本にしてください。

- 状態 / イベントハンドラ / シャッフルロジックは `page.tsx` (= コンテナ) に書く
- 表示部品は props を受け取って描画するだけにする (= プレゼンテーション)

こうすると、

- ロジックを Zustand / Redux / サーバーに移す時、`page.tsx` だけ書き換えれば済む
- 部品は単独でテストできるようになる

### 命名・スタイル規約

- ファイル名: kebab-case (例: `member-list.tsx`)
- コンポーネント名: PascalCase (例: `MemberList`)
- 関数 / 変数: camelCase
- 定数: UPPER_SNAKE_CASE (例: `INITIAL_MEMBERS`)
- 色は `globals.css` の CSS 変数を使う (例: `var(--flamingo)`)
  - 直接 hex を書かない
- Tailwind が使えるところは Tailwind、足りないところだけ inline `style`

### 状態の持たせ方

最初は `useState` で十分。次のいずれかが起きたら検討:

- 複数画面で同じ状態を共有したい → Context もしくは Zustand
- サーバーから取りたい → React Query / SWR
- URL に状態を残したい (検索条件など) → `useSearchParams`

### Tips

- サイドバーの「つまみ」が active アイコンに追従しないとき:
  - URL と `TOP_ITEMS` / `BOTTOM_ITEMS` の `href` が一致しているか確認
- `<Image>` を使うと自動最適化される。サイズが分かっている場合は `width`/`height` を必ず指定
- ブランドカラーを変えたいときは `app/globals.css` の `--flamingo*` を編集 (1箇所変えれば全画面に反映)

## デプロイ

`Dockerfile` で本番ビルド (Next.js standalone)、`Dockerfile.dev` で開発ホットリロード。
詳細は `docker-compose.yml` を参照。
