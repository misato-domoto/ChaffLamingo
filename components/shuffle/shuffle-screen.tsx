"use client";

/**
 * シャッフル画面 (Client Component) - Phase 4.5 完成版
 * --------------------------------------------------------------------
 * 機能:
 *   1. レイアウト選択 (カードクリック → 確認 → 選択)
 *   2. メンバー検索 / タグ絞り込み / 選択トグル / 全選択
 *   3. シャッフル: 選択メンバーをレイアウトの椅子にランダム割当
 *   4. ドラッグ&ドロップで「この人はこの椅子に固定」(再シャッフルしてもズレない)
 *   5. シャッフル結果ダイアログ: 画像 + パスコピー + ダウンロード + 保存
 *
 * 状態モデル:
 *   - assignments: Map<chairId, Member>     - シャッフル結果 (固定+ランダム)
 *   - pinned:      Map<chairId, memberId>   - ピン留め (固定) の記録
 *   - 再シャッフル時は pinned のメンバーは動かさず、それ以外の椅子に
 *     残りメンバーをランダム配分する
 */

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  Star,
  Shuffle as ShuffleIcon,
  Pin,
  RotateCcw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { MemberList } from "@/components/shuffle/member-list";
import {
  LayoutCanvas,
  type ChairDisplayMode,
} from "@/components/shuffle/layout-canvas";

/**
 * SVG ツリー内の全 <image> 要素について、href/xlink:href が外部 URL なら
 * fetch して base64 data URL に置き換える。
 * - SVG → PNG 変換時、外部画像参照は描画されないことが多いため、
 *   こうして単一文書化することで PNG にも写真が乗るようになる。
 */
async function inlineSvgImageHrefs(svgEl: SVGSVGElement) {
  const images = Array.from(svgEl.querySelectorAll("image"));
  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute("href") ||
        img.getAttribute("xlink:href") ||
        "";
      if (!href || href.startsWith("data:")) return;
      try {
        const res = await fetch(href);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.setAttribute("href", dataUrl);
        // 古い SVG では xlink:href の方が見られることがあるので両方更新
        img.setAttribute("xlink:href", dataUrl);
      } catch {
        /* 1 枚失敗してもそのまま続行 (空の椅子になるだけ) */
      }
    }),
  );
}
import { toggleLayoutFavorite } from "@/lib/data";

/**
 * 結果 PNG を API ルート (POST /api/results-pictures) にアップロードする。
 * Server Action 経由だと body size 制限 (1MB) でかかってしまうので分離。
 */
async function uploadResultImage(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], "result.png", { type: "image/png" }));
  const res = await fetch("/api/results-pictures", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => null)) as
    | { path?: string; error?: string }
    | null;
  if (!res.ok || !data?.path) {
    throw new Error(data?.error || `保存 API がエラー (${res.status})`);
  }
  return data.path;
}
import type { Layout, Member, Tag } from "@/lib/types";
import { getDisplayName } from "@/lib/types";

type Props = {
  members: Member[];
  tags: Tag[];
  layouts: Layout[];
};

export function ShuffleScreen({ members, tags, layouts }: Props) {
  // ── 状態 ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  // 仕様: 初期表示時はレイアウトを選択していない状態
  const [selectedLayoutName, setSelectedLayoutName] = useState<string | null>(
    null,
  );

  /** chairId → 割り当て済みメンバーID。シャッフルやドラッグ&ドロップで更新。 */
  const [assignmentIds, setAssignmentIds] = useState<Map<string, string>>(
    new Map(),
  );
  /** chairId → 固定済みメンバーID (ドラッグ&ドロップで設定)。 */
  const [pinnedIds, setPinnedIds] = useState<Map<string, string>>(new Map());

  /**
   * 椅子の表示モード:
   *   - "name-along-chair": アイコン (写真) + 椅子の外側に名前 (曲線)
   *   - "surname-in-chair": 椅子内に苗字を直接表示 (アイコン非表示)
   */
  const [displayMode, setDisplayMode] = useState<ChairDisplayMode>(
    "name-along-chair",
  );

  // ダイアログ
  const [pendingLayout, setPendingLayout] = useState<Layout | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  // PNG 保存用
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── 派生値 ──────────────────────────────────────────────────────
  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        const matchSearch = getDisplayName(m)
          .toLowerCase()
          .includes(search.trim().toLowerCase());
        const matchTag =
          filterTagIds.size === 0 ||
          (m.tagIds ?? []).some((tid) => filterTagIds.has(tid));
        return matchSearch && matchTag;
      }),
    [members, search, filterTagIds],
  );

  const shufflablePool = useMemo(
    () => filteredMembers.filter((m) => selectedIds.has(m.id)),
    [filteredMembers, selectedIds],
  );
  const selectedCount = shufflablePool.length;

  const selectedLayout =
    layouts.find((l) => l.name === selectedLayoutName) ?? null;


  // assignmentIds → Map<chairId, Member> に解決 (LayoutCanvas に渡す用)
  const assignments = useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const map = new Map<string, Member>();
    for (const [chairId, memberId] of assignmentIds) {
      const m = memberMap.get(memberId);
      if (m) map.set(chairId, m);
    }
    return map;
  }, [assignmentIds, members]);

  const pinnedChairIds = useMemo(
    () => new Set(pinnedIds.keys()),
    [pinnedIds],
  );

  /** レイアウト内の全椅子 ID (順番が安定するようテーブル順を維持) */
  const allChairIds = useMemo(() => {
    if (!selectedLayout) return [];
    return selectedLayout.tables.flatMap((t) => t.chairs.map((c) => c.id));
  }, [selectedLayout]);

  // ── アクション ──────────────────────────────────────────────────
  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const everyoneSelected =
      filteredMembers.length > 0 &&
      filteredMembers.every((m) => selectedIds.has(m.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredMembers.forEach((m) => {
        if (everyoneSelected) next.delete(m.id);
        else next.add(m.id);
      });
      return next;
    });
  };

  const handleToggleFavorite = (layoutName: string) => {
    startTransition(async () => {
      await toggleLayoutFavorite(layoutName);
    });
  };

  /** 椅子にメンバーがドロップされた時: ピン留めとして記録 + 即時表示 */
  const handleDropOnChair = (chairId: string, memberId: string) => {
    setPinnedIds((prev) => {
      const next = new Map(prev);
      // 同じメンバーが他の椅子に既にピン留めされていたら、そちらは解除
      for (const [c, mid] of next) {
        if (mid === memberId && c !== chairId) next.delete(c);
      }
      next.set(chairId, memberId);
      return next;
    });
    setAssignmentIds((prev) => {
      const next = new Map(prev);
      // 同じメンバーが他の椅子に居たら追い出す (重複防止)
      for (const [c, mid] of next) {
        if (mid === memberId && c !== chairId) next.delete(c);
      }
      next.set(chairId, memberId);
      return next;
    });
  };

  /** 椅子クリック: ピン留めを解除 */
  const handleClickChair = (chairId: string) => {
    if (!pinnedIds.has(chairId)) return;
    if (!confirm("この椅子の固定を解除しますか?")) return;
    setPinnedIds((prev) => {
      const next = new Map(prev);
      next.delete(chairId);
      return next;
    });
  };

  /** ピンを全部解除 */
  const clearAllPins = () => {
    setPinnedIds(new Map());
  };

  /**
   * シャッフル本体:
   *   1. 固定 (pinned) のメンバーはそのまま残す
   *   2. 残りのメンバーをランダムに、空いてる椅子に配分する
   */
  const handleShuffle = () => {
    if (!selectedLayout || shufflablePool.length === 0) return;

    // 結果マップを構築開始
    const result = new Map<string, string>();
    const usedMemberIds = new Set<string>();

    // 固定を先に反映
    for (const [chairId, memberId] of pinnedIds) {
      if (
        allChairIds.includes(chairId) &&
        shufflablePool.some((m) => m.id === memberId)
      ) {
        result.set(chairId, memberId);
        usedMemberIds.add(memberId);
      }
    }

    // 残りの椅子とメンバーを抽出
    const remainingChairs = allChairIds.filter((c) => !result.has(c));
    const remainingMembers = shufflablePool.filter(
      (m) => !usedMemberIds.has(m.id),
    );

    // Fisher–Yates でメンバーをシャッフル
    const shuffled = [...remainingMembers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // ラウンドロビン的に椅子へ割り当て (椅子数 > メンバー数なら余り席は空)
    for (let i = 0; i < Math.min(remainingChairs.length, shuffled.length); i++) {
      result.set(remainingChairs[i], shuffled[i].id);
    }

    setAssignmentIds(result);
    setSavedPath(null); // 新しいシャッフルなので前回の保存パスはクリア
    setResultOpen(true);
  };

  /**
   * 結果 SVG を PNG に変換して uploadResultImage (POST /api/results-pictures) で保存する。
   *
   * 重要: SVG 内の外部 <image href="/data/..."> をそのままシリアライズすると、
   * 画像化したときに <img> 側で外部リソースが解決できず、
   *   - 描画されない (PNG 上に写真が出ない)
   *   - canvas が tainted になって toBlob が失敗する
   * のいずれかが起きる。対策として、シリアライズ前に SVG をクローンし、
   * その中の <image href> を全て base64 data URL に置き換える (inline 化)。
   */
  const handleSaveResult = async () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    try {
      // 0) SVG をクローンし、外部画像参照を base64 に inline 化
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      // 重要: XMLSerializer は SVG の xmlns を補完してくれない。
      // クローン直後に xmlns を明示しておかないと、Blob 化したあと
      // <img> でロード時に「無効な SVG」扱いされてエラーになる。
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      await inlineSvgImageHrefs(clone);

      // 1) シリアライズして data URL の <img> にロード。
      //    blob URL ではなく data: 形式にすると、一部ブラウザでの
      //    "tainted canvas" / 描画失敗を回避できる。
      const svgString = new XMLSerializer().serializeToString(clone);
      const svgDataUrl =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(svgString);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error(
              "SVG の画像化に失敗しました (写真の埋め込み or 形式エラーの可能性)",
            ),
          );
        img.src = svgDataUrl;
      });

      // 2) canvas に描画 (2x スケール)
      const vb = svgEl.viewBox.baseVal;
      const SCALE = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, vb.width) * SCALE;
      canvas.height = Math.max(1, vb.height) * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context が取れません");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 3) Blob 化 → Server Action で保存
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("toBlob 失敗 (canvas が tainted の可能性)"));
        }, "image/png");
      });

      const savedAt = await uploadResultImage(blob);
      setSavedPath(savedAt);
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : "不明なエラー";
      alert(`結果画像の保存に失敗しました: ${message}`);
    }
  };

  /** 保存済みパスをクリップボードへ */
  const handleCopyPath = async () => {
    if (!savedPath) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${savedPath}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  // ── 描画 ───────────────────────────────────────────────────────
  return (
    <main className="px-4 py-4 sm:px-2 sm:py-6">
      <h1 className="mb-4 text-xl font-bold text-shuffle">
        シャッフル画面
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 左: Canvas */}
        <Card className="h-[calc(100vh-200px)] py-4">
          <CardContent className="px-6">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-base font-bold text-shuffle">
              <span>{selectedCount} 人選択中</span>
              {pinnedIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearAllPins}
                  title="固定を全て解除"
                  className="inline-flex items-center gap-1 rounded-full bg-flamingo-tint px-3 py-0.5 text-xs font-medium text-flamingo-deep hover:bg-flamingo-soft"
                >
                  <Pin className="h-3 w-3" />
                  {pinnedIds.size} 人固定中 (クリックで解除)
                </button>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* 表示モード切替 (アイコン+曲線名 / 椅子内に苗字) */}
                <div
                  className="inline-flex overflow-hidden rounded-full border border-shuffle text-xs font-bold"
                  role="radiogroup"
                  aria-label="椅子の表示モード"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={displayMode === "name-along-chair"}
                    onClick={() => setDisplayMode("name-along-chair")}
                    className={
                      displayMode === "name-along-chair"
                        ? "bg-shuffle px-3 py-1 text-white"
                        : "bg-white px-3 py-1 text-shuffle hover:bg-shuffle-tint"
                    }
                  >
                    　名前とアイコン　
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={displayMode === "surname-in-chair"}
                    onClick={() => setDisplayMode("surname-in-chair")}
                    className={
                      displayMode === "surname-in-chair"
                        ? "bg-shuffle px-3 py-1 text-white"
                        : "bg-white px-3 py-1 text-shuffle hover:bg-shuffle-tint"
                    }
                  >
                    座席に名前を表示
                  </button>
                </div>

                {selectedLayoutName ? (
                  <Link
                    href={`/layouts?name=${encodeURIComponent(selectedLayoutName)}`}
                    className="rounded-full border-2 border-shuffle bg-shuffle px-4 py-1 text-base font-bold text-white transition-colors hover:bg-shuffle-deep hover:border-shuffle-deep"
                  >
                    レイアウト編集
                  </Link>
                ) : (
                  <Link
                    href="/layouts"
                    className="rounded-full border-2 border-shuffle bg-shuffle px-4 py-1 text-base font-bold text-white transition-colors hover:bg-shuffle-deep hover:border-shuffle-deep"
                  >
                    レイアウト作成
                  </Link>
                )}
              </div>
            </div>

            {/* レイアウト可視化エリア */}
            <div
              className="w-full h-[calc(100vh-300px)] rounded-2xl bg-(--shuffle-tint)/40"
            >
              {selectedLayout ? (
                <LayoutCanvas
                  layout={selectedLayout}
                  assignments={assignments}
                  pinned={pinnedChairIds}
                  onDropMember={handleDropOnChair}
                  onClickChair={handleClickChair}
                  displayMode={displayMode}
                />
              ) : (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  <div>
                    <p>レイアウトが選択されていません</p>
                    <p className="mt-2 text-xs">
                      下の「座席レイアウト選択」からレイアウトを選んでください
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              右リストの名前を椅子にドラッグ&ドロップで固定 / 椅子クリックで固定解除
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <MemberList
            members={filteredMembers}
            selectedIds={selectedIds}
            tags={tags}
            filterTagIds={filterTagIds}
            search={search}
            onSearchChange={setSearch}
            onToggle={toggleMember}
            onSelectAll={selectAll}
            onFilterTagsChange={setFilterTagIds}
            enableDrag
          />

          {/* シャッフルボタンは MemberList の下に常に固定。
              レイアウト一覧の幅やスクロールに影響されない位置。 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleShuffle}
              disabled={!selectedLayout || shufflablePool.length === 0}
              className="ml-auto h-28 w-28 place-items-center rounded-full bg-shuffle text-center leading-tight text-white shadow-lg shadow-(--shuffle)/30 transition-colors hover:bg-shuffle-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--shuffle)/30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span className="text-base font-bold">シャッフル</span>
            </button>
          </div>
        </div>
      </div>

      {/* 下段: 座席レイアウト選択 + シャッフルボタン
            右ペイン (MemberList 280px + grid gap 24px) ぶんを右に padding して
            Canvas と同じ視覚的横幅に揃える */}
      <div className="mt-2 lg:pr-76">
        <h2 className="mb-2 text-base font-semibold text-shuffle">
          座席レイアウト選択
        </h2>

        {layouts.length === 0 ? (
          <Card className="p-6">
            <CardContent className="p-0 text-sm text-muted-foreground">
              まだレイアウトが保存されていません。
              <Link
                href="/layouts"
                className="ml-2 text-shuffle underline hover:text-shuffle-deep"
              >
                /layouts で作成 →
              </Link>
            </CardContent>
          </Card>
        ) : (
          /*
           * 横一行レイアウト + 右端フェード。
           * - flex-nowrap で複数行にならない
           * - overflow-x-auto + スクロールバー非表示で、はみ出した分は横スクロール可
           * - mask-image による linear-gradient で、4 枚目以降から右端に向けて
           *   グラデーションで透明になる (= 「もっとある」ことを示す)
           * - 4 枚 + ギャップ + 5 枚目の見えはじめ位置を計算するのが厳密には難しいので、
           *   コンテナ幅の 75% 以降をフェード対象にしている (= 4 枚目までは完全に見える)
           */
          <div
            className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: "none",
              maskImage:
                "linear-gradient(to right, black 75%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 75%, transparent 100%)",
            }}
          >
            <div className="flex w-max items-center gap-6 pr-4">
              {layouts.map((layout) => {
                const isSelected = layout.name === selectedLayoutName;
                return (
                  <Card
                    key={layout.name}
                    className={`relative h-41 w-70 shrink-0 cursor-pointer overflow-hidden transition ${
                      isSelected
                        ? "ring-2 ring-shuffle"
                        : "hover:opacity-90"
                    }`}
                    onClick={() => setPendingLayout(layout)}
                  >
                    <CardContent className="p-0">
                      {/* レイアウトのミニプレビュー */}
                      <div className="absolute inset-0 grid place-items-center bg-(--shuffle-tint)/30 p-2">
                        <div className="h-full w-full">
                          <LayoutCanvas
                            layout={layout}
                            assignments={new Map()}
                            pinned={new Set()}
                            displayMode="name-along-chair"
                            preview
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(layout.name);
                        }}
                        aria-label={
                          layout.isFavorite
                            ? "お気に入り解除"
                            : "お気に入り登録"
                        }
                        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/85 transition-colors"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            layout.isFavorite
                              ? "fill-flamingo text-flamingo"
                              : "text-muted-foreground hover:text-flamingo"
                          }`}
                        />
                      </button>

                      <div className="absolute inset-x-0 bottom-0 z-10 truncate bg-white/85 px-3 py-1 text-[14px] font-bold text-shuffle-deep">
                        {layout.name}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* レイアウト選択確認ダイアログ */}
      <ConfirmDialog
        open={pendingLayout !== null}
        message={
          pendingLayout
            ? `「${pendingLayout.name}」を選択しますか？`
            : ""
        }
        okLabel="OK"
        onConfirm={() => {
          if (pendingLayout) {
            setSelectedLayoutName(pendingLayout.name);
            // レイアウトが変わったら割当と固定を初期化
            setAssignmentIds(new Map());
            setPinnedIds(new Map());
          }
          setPendingLayout(null);
        }}
        onCancel={() => setPendingLayout(null)}
      />

      {/* シャッフル結果ダイアログ */}
      <Dialog
        open={resultOpen}
        onOpenChange={(open) => !open && setResultOpen(false)}
      >
        <DialogContent className="w-[min(98vw,1400px)] max-w-none border-0 bg-transparent p-0 shadow-none overflow-visible [&>button]:hidden">
          <div className="rounded-xl bg-linear-to-br from-flamingo via-flamingo-soft to-shuffle p-1">
            <div className="rounded-xl bg-white p-5">
              <DialogHeader>
                <DialogTitle className="mb-3 text-center text-2xl font-bold text-shuffle">
                  シャッフル結果
                </DialogTitle>
              </DialogHeader>

              {/* プレビュー canvas (大きく / 16:10 でレイアウト本来の比率) */}
              <div className="mx-auto mb-4 aspect-16/10 w-full max-w-325 overflow-hidden rounded-2xl bg-white">
                {selectedLayout && (
                  <LayoutCanvas
                    layout={selectedLayout}
                    assignments={assignments}
                    pinned={pinnedChairIds}
                    svgRef={svgRef}
                    displayMode={displayMode}
                  />
                )}
              </div>

              {/* アクション */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-shuffle bg-white px-4 py-1 text-sm font-bold text-shuffle hover:bg-shuffle-tint"
                >
                  <RotateCcw className="h-4 w-4" />
                  もう一度シャッフル
                </button>
                {savedPath === null ? (
                  <button
                    type="button"
                    onClick={handleSaveResult}
                    className="rounded-full bg-shuffle px-4 py-1 text-sm font-bold text-white hover:bg-shuffle-deep"
                  >
                    結果を保存
                  </button>
                ) : (
                  <span className="rounded-full bg-shuffle-tint px-3 py-1 text-sm text-shuffle-deep">
                    保存しました ✓
                  </span>
                )}
              </div>

              {/* 保存後: パスコピー + ダウンロード */}
              {savedPath && (
                <div className="mt-3 flex justify-center">
                  <div className="flex h-10 w-full max-w-150 overflow-hidden rounded-full border-2 border-shuffle">
                    <input
                      readOnly
                      value={savedPath}
                      className="h-full flex-1 rounded-none border-0 bg-white px-4 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="flex h-full w-20 items-center justify-center bg-shuffle text-sm font-bold text-white transition-colors hover:bg-shuffle-deep"
                    >
                      {copied ? "✓" : "コピー"}
                    </button>
                  </div>
                </div>
              )}
              {savedPath && (
                <div className="mt-2 flex justify-center">
                  <a
                    href={savedPath}
                    download
                    className="text-xs text-shuffle underline hover:text-shuffle-deep"
                  >
                    画像をダウンロード
                  </a>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}