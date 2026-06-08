"use client";

/**
 * 座席レイアウト + メンバー割当の SVG レンダラー
 * --------------------------------------------------------------------
 * SeatLayoutEditor と同じワークスペース (1600 x 1000) を viewBox に使うので、
 * 背景画像とテーブル/オブジェクトの相対位置が編集画面と完全に一致する。
 *
 * 主な機能:
 *   - 背景: layout.backgroundImagePath を表示。無ければ 24px ピッチのグリッド
 *   - テーブル: 形状別 SVG (circle / ellipse / rect / semicircle / triangle)、
 *     回転は <g transform="rotate(...)" />、tableBorderColor を反映
 *   - テーブル名: テーブル中央に小さなピル形で表示 (labelColor)
 *   - 椅子: chairSizeScale / chairRailGap を反映、chairBorderColor で枠線
 *   - メンバー: 写真ありは clipPath で椅子に貼り付け、無しは塗りつぶし
 *   - 名前表示モード:
 *       "name-along-chair"  → 椅子の外側に曲線 (textPath)
 *       "surname-in-chair"  → 椅子の中に苗字を直接表示 (写真は出さない)
 *   - preview prop: ズームコントロール/スクロールを省いた読み取り専用表示
 *     (座席レイアウト選択カード等で使う)
 *
 * 色は CSS 変数だと PNG 化時に解決できないので hex 直書き (PALETTE)。
 */

import { useMemo, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import type { Layout, LayoutChair, LayoutTable, Member } from "@/lib/types";
import { getDisplayName, getSurnameForDisplay } from "@/lib/types";

// エディタと同じ初期値
const DEFAULT_CHAIR_SIZE = 30;
const DEFAULT_CHAIR_SIZE_SCALE = 1;
const MAX_CHAIR_SIZE_SCALE = 2.2;
const DEFAULT_CHAIR_RAIL_GAP = 18;
const MIN_CHAIR_RAIL_GAP = 0;
const MAX_CHAIR_RAIL_GAP = 120;
// SeatLayoutEditor の WORKSPACE 寸法と一致させる (背景位置を揃えるため)
const WORKSPACE_WIDTH = 1600;
const WORKSPACE_HEIGHT = 1000;

// 色 (PNG 化時に CSS 変数が解決できないので hex 直書き)
const PALETTE = {
  flamingo: "#e8447d",
  flamingoSoft: "#f7a8c0",
  flamingoTint: "#ffeef3",
  flamingoDeep: "#d63a6f",
  shuffle: "#4cabd8",
  shuffleSoft: "#b8dcec",
  border: "#9ca3af",
  text: "#1f1f1f",
  muted: "#888888",
  gridLine: "#e2e8f0",
} as const;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

export type ChairDisplayMode = "name-along-chair" | "surname-in-chair";

type Props = {
  layout: Layout;
  /** chairId → 割り当て済みメンバー (未割当は undefined) */
  assignments: Map<string, Member>;
  /** ピン留めされている椅子 ID 集合 */
  pinned: Set<string>;
  /** 椅子にメンバー名がドロップされた時 */
  onDropMember?: (chairId: string, memberId: string) => void;
  /** 椅子クリック時 (ピン解除用など) */
  onClickChair?: (chairId: string) => void;
  /** PNG エクスポート用に親が SVG 要素を参照したい時の ref */
  svgRef?: React.RefObject<SVGSVGElement | null>;
  /** 椅子上の表示モード (省略時 "name-along-chair") */
  displayMode?: ChairDisplayMode;
  /**
   * プレビューモード: true の場合、ズームコントロール/スクロールを無効化し
   * SVG をコンテナにフィットさせるだけ。レイアウト選択カード等で使う。
   */
  preview?: boolean;
};

// ── ヘルパ ──────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function normalizeAngle(a: number) {
  return ((a % 360) + 360) % 360;
}

// 苗字表示は lib/types の getSurnameForDisplay() を使う
// (Member 型の lastName が空でも name から復元する責務はそちらに集約)

/** エディタの getChairSize と同じ式 */
function getChairSize(table: LayoutTable) {
  const scale = table.chairSizeScale ?? DEFAULT_CHAIR_SIZE_SCALE;
  return clamp(
    Math.min(table.width, table.height) * 0.2 * scale,
    10,
    DEFAULT_CHAIR_SIZE * MAX_CHAIR_SIZE_SCALE,
  );
}

/** エディタの getChairRailGap と同じ式 */
function getChairRailGap(table: LayoutTable) {
  return clamp(
    table.chairRailGap ?? DEFAULT_CHAIR_RAIL_GAP,
    MIN_CHAIR_RAIL_GAP,
    MAX_CHAIR_RAIL_GAP,
  );
}

/**
 * 椅子のローカル中心位置 (テーブル基準) を返す。
 * エディタの getChairPosition と同等。
 */
function getChairLocalCenter(
  table: LayoutTable,
  chair: LayoutChair,
): { x: number; y: number } {
  const chairSize = getChairSize(table);
  const railGap = getChairRailGap(table);
  const rad = (chair.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  if (table.shape === "circle" || table.shape === "ellipse") {
    const rx = table.width / 2 + railGap + chairSize / 2;
    const ry = table.height / 2 + railGap + chairSize / 2;
    return {
      x: table.width / 2 + dx * rx,
      y: table.height / 2 + dy * ry,
    };
  }

  if (table.shape === "semicircle") {
    const angle = normalizeAngle(chair.angle);
    if (angle <= 180) {
      const ratio = angle / 180;
      return {
        x: table.width * (1 - ratio),
        y: table.height + railGap + chairSize / 2,
      };
    }
    const r = (angle * Math.PI) / 180;
    const rx = table.width / 2 + railGap + chairSize / 2;
    const ry = table.height + railGap + chairSize / 2;
    return {
      x: table.width / 2 + Math.cos(r) * rx,
      y: table.height + Math.sin(r) * ry,
    };
  }

  // rect / triangle
  const halfW = table.width / 2 + railGap + chairSize / 2;
  const halfH = table.height / 2 + railGap + chairSize / 2;
  const scaleX = Math.abs(dx) > 0.0001 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.0001 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return {
    x: table.width / 2 + dx * scale,
    y: table.height / 2 + dy * scale,
  };
}

/**
 * 点 (px, py) を中心 (cx, cy) のまわりに angle 度回転させた結果。
 * SVG の rotate transform と同じ向き (時計回り、Y は下向き)。
 */
function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

// ── メインコンポーネント ─────────────────────────────────────────

export function LayoutCanvas({
  layout,
  assignments,
  pinned,
  onDropMember,
  onClickChair,
  svgRef,
  displayMode = "name-along-chair",
  preview = false,
}: Props) {
  // viewBox はエディタの WORKSPACE と一致 → 背景画像/配置が完全に同じになる
  const bounds = useMemo(
    () => ({ x: 0, y: 0, w: WORKSPACE_WIDTH, h: WORKSPACE_HEIGHT }),
    [],
  );

  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  const zoomOut = () =>
    setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  const zoomReset = () => setZoom(1);

  // プレビューモード: 装飾なしの SVG だけ返す
  if (preview) {
    return (
      <svg
        ref={svgRef}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <LayoutSvgInner
          layout={layout}
          assignments={assignments}
          pinned={pinned}
          displayMode={displayMode}
          interactive={false}
        />
      </svg>
    );
  }

  // フルモード: ズームコントロール + スクロール領域 + SVG
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* ズームコントロール (右上に浮かせる) */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 shadow-sm">
        <button
          type="button"
          onClick={zoomOut}
          aria-label="ズームアウト"
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-10 text-center text-xs font-semibold tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="ズームイン"
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          aria-label="100%"
          title="ぴったり収める"
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="h-full w-full overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%` }}
        >
          <LayoutSvgInner
            layout={layout}
            assignments={assignments}
            pinned={pinned}
            displayMode={displayMode}
            interactive
            onDropMember={onDropMember}
            onClickChair={onClickChair}
          />
        </svg>
      </div>
    </div>
  );
}

// ── SVG 本体 (フル/preview 共用) ─────────────────────────────────

type SvgInnerProps = {
  layout: Layout;
  assignments: Map<string, Member>;
  pinned: Set<string>;
  displayMode: ChairDisplayMode;
  interactive: boolean;
  onDropMember?: (chairId: string, memberId: string) => void;
  onClickChair?: (chairId: string) => void;
};

function LayoutSvgInner({
  layout,
  assignments,
  pinned,
  displayMode,
  interactive,
  onDropMember,
  onClickChair,
}: SvgInnerProps) {
  return (
    <>
      <defs>
        {/* グリッド背景 (24px ピッチ、エディタと同じ) */}
        <pattern
          id="grid"
          x={0}
          y={0}
          width={24}
          height={24}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke={PALETTE.gridLine}
            strokeWidth={1}
          />
        </pattern>

                {/* 椅子写真用 clipPath (name-along-chair モード時のみ意味がある) */}
        {displayMode === "name-along-chair" &&
          layout.tables.flatMap((table) => {
            const cx = table.x + table.width / 2;
            const cy = table.y + table.height / 2;
            const chairSize = getChairSize(table);
            return table.chairs.map((chair) => {
              const m = assignments.get(chair.id);
              if (!m?.pictureUrl) return null;
              const local = getChairLocalCenter(table, chair);
              const abs = rotatePoint(
                table.x + local.x,
                table.y + local.y,
                cx,
                cy,
                table.rotation,
              );
              return (
                <clipPath
                  key={`clip-${chair.id}`}
                  id={`clip-${chair.id}`}
                >
                  <circle cx={abs.x} cy={abs.y} r={chairSize / 2} />
                </clipPath>
              );
            });
          })}

        {/* 椅子に沿った曲線パス (name-along-chair モード時のみ使う) */}
        {displayMode === "name-along-chair" &&
          layout.tables.flatMap((table) => {
            const cx = table.x + table.width / 2;
            const cy = table.y + table.height / 2;
            const chairSize = getChairSize(table);
            const r = chairSize / 2 + 6;
            return table.chairs.map((chair) => {
              const m = assignments.get(chair.id);
              if (!m) return null;
              const local = getChairLocalCenter(table, chair);
              const abs = rotatePoint(
                table.x + local.x,
                table.y + local.y,
                cx,
                cy,
                table.rotation,
              );
              const outwardA = Math.atan2(abs.y - cy, abs.x - cx);
              const startA = outwardA - Math.PI / 2;
              const endA = outwardA + Math.PI / 2;
              const x1 = abs.x + r * Math.cos(startA);
              const y1 = abs.y + r * Math.sin(startA);
              const x2 = abs.x + r * Math.cos(endA);
              const y2 = abs.y + r * Math.sin(endA);
              return (
                <path
                  key={`name-arc-${chair.id}`}
                  id={`name-arc-${chair.id}`}
                  d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                />
              );
            });
          })}
      </defs>
      
      {/* 背景: 白 → 画像 or グリッド */}
      <rect
        x={0}
        y={0}
        width={WORKSPACE_WIDTH}
        height={WORKSPACE_HEIGHT}
        fill="white"
      />
      {layout.backgroundImagePath ? (
        <image
          href={layout.backgroundImagePath}
          x={0}
          y={0}
          width={WORKSPACE_WIDTH}
          height={WORKSPACE_HEIGHT}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={WORKSPACE_WIDTH}
          height={WORKSPACE_HEIGHT}
          fill="url(#grid)"
        />
      )}

      {/* オブジェクト (背景レイヤ) */}
      {layout.objects.map((o) => {
        const cx = o.x + o.width / 2;
        const cy = o.y + o.height / 2;
        return (
          <g key={o.id} transform={`rotate(${o.rotation} ${cx} ${cy})`}>
            {o.shape === "circle" ? (
              <ellipse
                cx={cx}
                cy={cy}
                rx={o.width / 2}
                ry={o.height / 2}
                fill={o.color}
                stroke={PALETTE.border}
                strokeWidth={1.5}
              />
            ) : (
              <rect
                x={o.x}
                y={o.y}
                width={o.width}
                height={o.height}
                rx={16}
                fill={o.color}
                stroke={PALETTE.border}
                strokeWidth={1.5}
              />
            )}
            {o.name && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(10, Math.min(o.width, o.height) * 0.15)}
                fontWeight={600}
                fill={PALETTE.text}
              >
                {o.name}
              </text>
            )}
          </g>
        );
      })}

      {/* テーブル + テーブル名 (テーブル名は中央に表示) */}
      {layout.tables.map((table) => {
        const cx = table.x + table.width / 2;
        const cy = table.y + table.height / 2;
        const labelColor = table.labelColor ?? PALETTE.text;
        const tableName = (table.name ?? "").trim();
        return (
          <g
            key={table.id}
            transform={`rotate(${table.rotation} ${cx} ${cy})`}
          >
            <TableSurface table={table} />

            {tableName && (
              <g>
                <rect
                  x={cx - Math.min(table.width * 0.42, 120)}
                  y={cy - Math.max(10, table.height * 0.08)}
                  width={Math.min(table.width * 0.84, 240)}
                  height={Math.max(20, table.height * 0.16)}
                  rx={8}
                  fill="rgba(255,255,255,0.85)"
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(
                    11,
                    Math.min(20, table.height * 0.12),
                  )}
                  fontWeight={700}
                  fill={labelColor}
                >
                  {tableName}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 椅子 (テーブル回転を含めた絶対座標で描画) */}
      {layout.tables.flatMap((table) => {
        const cx = table.x + table.width / 2;
        const cy = table.y + table.height / 2;
        const chairSize = getChairSize(table);
        return table.chairs.map((chair) => {
          const local = getChairLocalCenter(table, chair);
          const abs = rotatePoint(
            table.x + local.x,
            table.y + local.y,
            cx,
            cy,
            table.rotation,
          );
          const member = assignments.get(chair.id);
          const isPinned = pinned.has(chair.id);
          const labelFill = table.labelColor ?? PALETTE.flamingoDeep;
          const chairStroke = isPinned
            ? PALETTE.flamingo
            : (table.chairBorderColor ?? PALETTE.border);

          // 椅子クリック / ドロップ用のハンドラ (interactive=true のみ)
          const handlers = interactive
            ? {
                onDragOver: (e: React.DragEvent<SVGGElement>) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                },
                onDrop: (e: React.DragEvent<SVGGElement>) => {
                  e.preventDefault();
                  const memberId = e.dataTransfer.getData("text/plain");
                  if (memberId && onDropMember) {
                    onDropMember(chair.id, memberId);
                  }
                },
                onClick: () => onClickChair?.(chair.id),
                style: {
                  cursor: onClickChair ? "pointer" : "default",
                },
              }
            : {};

          return (
            <g key={chair.id} {...handlers}>
              {/* 椅子本体 */}
              {displayMode === "name-along-chair" && member?.pictureUrl ? (
                <>
                  <image
                    href={member.pictureUrl}
                    x={abs.x - chairSize / 2}
                    y={abs.y - chairSize / 2}
                    width={chairSize}
                    height={chairSize}
                    clipPath={`url(#clip-${chair.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle
                    cx={abs.x}
                    cy={abs.y}
                    r={chairSize / 2}
                    fill="none"
                    stroke={chairStroke}
                    strokeWidth={isPinned ? 3 : 2}
                  />
                </>
              ) : (
                <circle
                  cx={abs.x}
                  cy={abs.y}
                  r={chairSize / 2}
                  fill={
                    displayMode === "surname-in-chair" || !member
                      ? table.chairColor
                      : "white"
                  }
                  stroke={chairStroke}
                  strokeWidth={isPinned ? 3 : 1.5}
                />
              )}

              {/* ピン (固定) マーカー */}
              {isPinned && (
                <circle
                  cx={abs.x + chairSize * 0.35}
                  cy={abs.y - chairSize * 0.35}
                  r={Math.max(3, chairSize * 0.12)}
                  fill={PALETTE.flamingo}
                />
              )}

              {/* 名前 (姓 / 名 を 2 段で small サイズ表示)。
                  両モード共通でロジック化:
                    - name-along-chair: 椅子の "外側" に 2 行で表示
                    - surname-in-chair: 椅子の "内側" に 2 行で中央配置
                  どちらも line1 = 姓、line2 = 名。空文字なら片方だけ表示。 */}
              {member &&
  (() => {
    const lastName =
      member.lastName?.trim() ||
      getSurnameForDisplay(member);
    const firstName = member.firstName?.trim() ?? "";

    const fontSize = Math.max(8, chairSize * 0.28);
    const lineHeight = fontSize *1.05;

    if (displayMode === "surname-in-chair") {
      return (
        <g>
          <text
            x={abs.x}
            y={abs.y - lineHeight / 1.5 + fontSize * 0.2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={700}
            fill={labelFill}
          >
            {lastName}
          </text>
          {firstName && (
            <text
              x={abs.x}
              y={abs.y + lineHeight / 3 + fontSize * 0.2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={700}
              fill={labelFill}
            >
              {firstName}
            </text>
          )}
        </g>
      );
    }

    // name-along-chair: 姓+名を一行で湾曲表示
    const fullName = [lastName, firstName].filter(Boolean).join(" ");

    return (
      <text
        fontSize={fontSize}
        fontWeight={700}
        fill={labelFill}
        textAnchor="middle"
        dominantBaseline="central"
      >
        <textPath
          href={`#name-arc-${chair.id}`}
          startOffset="50%"
        >
          {fullName}
        </textPath>
      </text>
    );
  })()}
            </g>
          );
        });
      })}

      {/* 空のレイアウト時のヒント */}
      {layout.tables.length === 0 && layout.objects.length === 0 && (
        <text
          x={WORKSPACE_WIDTH / 2}
          y={WORKSPACE_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={20}
          fill={PALETTE.muted}
        >
          このレイアウトには配置がありません
        </text>
      )}
    </>
  );
}

// ── テーブル形状別 SVG ───────────────────────────────────────────

function TableSurface({ table }: { table: LayoutTable }) {
  const stroke = table.tableBorderColor ?? PALETTE.border;

  if (table.shape === "circle") {
    const d = Math.min(table.width, table.height);
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={d / 2}
        fill={table.tableColor}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  if (table.shape === "ellipse") {
    return (
      <ellipse
        cx={table.x + table.width / 2}
        cy={table.y + table.height / 2}
        rx={table.width / 2}
        ry={table.height / 2}
        fill={table.tableColor}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  if (table.shape === "rect") {
    return (
      <rect
        x={table.x}
        y={table.y}
        width={table.width}
        height={table.height}
        rx={Math.min(20, Math.min(table.width, table.height) * 0.12)}
        fill={table.tableColor}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  if (table.shape === "semicircle") {
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height;
    const rx = table.width / 2;
    const ry = table.height;
    return (
      <path
        d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Z`}
        fill={table.tableColor}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  if (table.shape === "triangle") {
    const p1x = table.x + table.width / 2;
    const p1y = table.y;
    const p2x = table.x + table.width;
    const p2y = table.y + table.height;
    const p3x = table.x;
    const p3y = table.y + table.height;
    return (
      <polygon
        points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`}
        fill={table.tableColor}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  return null;
}
