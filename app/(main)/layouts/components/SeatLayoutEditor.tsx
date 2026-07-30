"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveLayout } from "@/lib/data";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Layout, TableShape, LayoutObjectShape } from "@/lib/types";

type Chair = {
  id: string;
  /**
   * circle / ellipse / semicircle / triangle: 角度。
   * rect: 矩形外周の進行度として使う。
   * 0: 右中央 / 90: 下中央 / 180: 左中央 / 270: 上中央
   */
  angle: number;
};

type TableItem = {
  id: string;
  kind: "table";
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  name: string;
  tableColor: string;
  chairColor: string;
  tableBorderColor: string;
  chairBorderColor: string;
  labelColor: string;
  /** テーブルごとに椅子の大きさを調整する倍率。既存データは 1 として扱う。 */
  chairSizeScale: number;
  /** テーブルごとに椅子スライド線とテーブルの距離を調整する。既存データは DEFAULT_CHAIR_RAIL_GAP として扱う。 */
  chairRailGap: number;
  chairs: Chair[];
};

type LayoutObject = {
  id: string;
  kind: "object";
  name: string;
  shape: LayoutObjectShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
};

type MoveTableOrigin = { id: string; x: number; y: number };
type MoveObjectOrigin = { id: string; x: number; y: number };

type DragMode =
  | {
      type: "move-selection";
      startX: number;
      startY: number;
      tableOrigins: MoveTableOrigin[];
      objectOrigins: MoveObjectOrigin[];
    }
  | { type: "resize-table"; tableId: string; startX: number; startY: number; originW: number; originH: number }
  | { type: "rotate-table"; tableId: string; centerX: number; centerY: number; startRotation: number; startAngle: number }
  | { type: "slide-chair"; tableId: string; chairId: string }
  | { type: "resize-object"; objectId: string; startX: number; startY: number; originW: number; originH: number }
  | { type: "rotate-object"; objectId: string; centerX: number; centerY: number; startRotation: number; startAngle: number }
  | null;

type CopiedSelection = {
  tables: TableItem[];
  objects: LayoutObject[];
};

type LayoutWithBackground = Layout & {
  backgroundImagePath?: string | null;
};

const MIN_TABLE_SIZE = 36;
const MIN_OBJECT_SIZE = 32;
const DEFAULT_TABLE_SIZE = 150;
const DEFAULT_OBJECT_WIDTH = 180;
const DEFAULT_OBJECT_HEIGHT = 90;
const DEFAULT_CHAIR_SIZE = 30;
const DEFAULT_CHAIR_SIZE_SCALE = 1;
const MIN_CHAIR_SIZE_SCALE = 0.5;
const MAX_CHAIR_SIZE_SCALE = 2.2;
const DEFAULT_CHAIR_RAIL_GAP = 18;
const MIN_CHAIR_RAIL_GAP = 0;
const MAX_CHAIR_RAIL_GAP = 120;
const DEFAULT_TABLE_COLOR = "#fde68a";
const DEFAULT_CHAIR_COLOR = "#bbf7d0";
const DEFAULT_TABLE_BORDER_COLOR = "#9ca3af";
const DEFAULT_CHAIR_BORDER_COLOR = "#9ca3af";
const DEFAULT_LABEL_COLOR = "#334155";
const DEFAULT_OBJECT_COLOR = "#e5e7eb";
const IDLE_BORDER = "#9ca3af";
const ACTIVE_BORDER = "#2563eb";
const MULTI_BORDER = "#7c3aed";
const CANVAS_ZOOM_MIN = 0.25;
const CANVAS_ZOOM_MAX = 3;
const CANVAS_ZOOM_STEP = 0.1;
const WORKSPACE_WIDTH = 1600;
const WORKSPACE_HEIGHT = 1000;
const PASTE_OFFSET = 36;

const TABLE_OPTIONS: { shape: TableShape; label: string; hint: string }[] = [
  { shape: "circle", label: "丸テーブル", hint: "円形" },
  { shape: "rect", label: "四角テーブル", hint: "長方形" },
  { shape: "semicircle", label: "半円テーブル", hint: "半円" },
  { shape: "triangle", label: "三角テーブル", hint: "三角形" },
  { shape: "ellipse", label: "楕円テーブル", hint: "楕円" },
];

function createTable(shape: TableShape, x: number, y: number): TableItem {
  const chairs = Array.from({ length: 1 }, (_, index) => ({
    id: crypto.randomUUID(),
    angle: shape === "semicircle" ? 270 : -90 + index * 360,
  }));

  return {
    id: crypto.randomUUID(),
    kind: "table",
    shape,
    x,
    y,
    width: shape === "ellipse" ? 180 : DEFAULT_TABLE_SIZE,
    height: shape === "ellipse" ? 120 : DEFAULT_TABLE_SIZE,
    rotation: 0,
    name: "",
    tableColor: DEFAULT_TABLE_COLOR,
    chairColor: DEFAULT_CHAIR_COLOR,
    tableBorderColor: DEFAULT_TABLE_BORDER_COLOR,
    chairBorderColor: DEFAULT_CHAIR_BORDER_COLOR,
    labelColor: DEFAULT_LABEL_COLOR,
    chairSizeScale: DEFAULT_CHAIR_SIZE_SCALE,
    chairRailGap: DEFAULT_CHAIR_RAIL_GAP,
    chairs,
  };
}

function createLayoutObject(x: number, y: number): LayoutObject {
  return {
    id: crypto.randomUUID(),
    kind: "object",
    name: "オブジェクト",
    shape: "rect",
    x,
    y,
    width: DEFAULT_OBJECT_WIDTH,
    height: DEFAULT_OBJECT_HEIGHT,
    rotation: 0,
    color: DEFAULT_OBJECT_COLOR,
  };
}

function getPointerPoint(event: React.PointerEvent | PointerEvent) {
  return { x: event.clientX, y: event.clientY };
}

function getAngleDeg(cx: number, cy: number, px: number, py: number) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isValidHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

async function uploadLayoutBackground(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/layouts-bg", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as { path?: string; error?: string } | null;

  if (!response.ok || !data?.path) {
    throw new Error(data?.error || "背景画像の保存に失敗しました");
  }

  return data.path;
}

function rotatePoint(x: number, y: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

function getChairSize(table: TableItem) {
  const scale = table.chairSizeScale ?? DEFAULT_CHAIR_SIZE_SCALE;
  return clamp(Math.min(table.width, table.height) * 0.2 * scale, 10, DEFAULT_CHAIR_SIZE * MAX_CHAIR_SIZE_SCALE);
}

function getChairRailGap(table: TableItem) {
  return clamp(table.chairRailGap ?? DEFAULT_CHAIR_RAIL_GAP, MIN_CHAIR_RAIL_GAP, MAX_CHAIR_RAIL_GAP);
}

function getCircleChairPosition(table: TableItem, chair: Chair, railGap: number) {
  const chairSize = getChairSize(table);
  const rad = (chair.angle * Math.PI) / 180;
  const radiusX = table.width / 2 + railGap + chairSize / 2;
  const radiusY = table.height / 2 + railGap + chairSize / 2;

  return {
    x: table.width / 2 + Math.cos(rad) * radiusX - chairSize / 2,
    y: table.height / 2 + Math.sin(rad) * radiusY - chairSize / 2,
  };
}

function getRectChairPosition(table: TableItem, chair: Chair, railGap: number) {
  const chairSize = getChairSize(table);
  const rad = (chair.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  const halfW = table.width / 2 + railGap + chairSize / 2;
  const halfH = table.height / 2 + railGap + chairSize / 2;

  const scaleX = Math.abs(dx) > 0.0001 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 0.0001 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: table.width / 2 + dx * scale - chairSize / 2,
    y: table.height / 2 + dy * scale - chairSize / 2,
  };
}

function getSemicircleChairPosition(table: TableItem, chair: Chair, railGap: number) {
  const chairSize = getChairSize(table);
  const angle = normalizeAngle(chair.angle);

  // 0〜180 は直線側、180〜360 は丸い弧側として扱う。
  // これにより、半円テーブルの下辺にも椅子をスライド配置できる。
  if (angle <= 180) {
    const ratio = angle / 180;
    return {
      x: table.width * (1 - ratio) - chairSize / 2,
      y: table.height + railGap,
    };
  }

  const rad = (angle * Math.PI) / 180;
  const radiusX = table.width / 2 + railGap + chairSize / 2;
  const radiusY = table.height + railGap + chairSize / 2;

  return {
    x: table.width / 2 + Math.cos(rad) * radiusX - chairSize / 2,
    y: table.height + Math.sin(rad) * radiusY - chairSize / 2,
  };
}

function getSemicircleChairAngleFromPoint(table: TableItem, localX: number, localY: number) {
  // 下辺付近では直線側へ吸着させる。左端=180、中央=90、右端=0。
  if (localY >= table.height * 0.72) {
    return clamp((1 - localX / table.width) * 180, 0, 180);
  }

  const angle = normalizeAngle(getAngleDeg(table.width / 2, table.height, localX, localY));
  return angle < 180 ? 360 : angle;
}

function getTriangleCenter(table: TableItem) {
  return { x: table.width / 2, y: table.height * 0.62 };
}

function getTriangleChairPosition(table: TableItem, chair: Chair, railGap: number) {
  const chairSize = getChairSize(table);
  const rad = (chair.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const center = getTriangleCenter(table);
  const vertices = [
    { x: table.width / 2, y: 0 },
    { x: table.width, y: table.height },
    { x: 0, y: table.height },
  ];

  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < vertices.length; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const denominator = dx * sy - dy * sx;
    if (Math.abs(denominator) < 0.0001) continue;

    const qx = start.x - center.x;
    const qy = start.y - center.y;
    const rayDistance = (qx * sy - qy * sx) / denominator;
    const segmentRatio = (qx * dy - qy * dx) / denominator;

    if (rayDistance >= 0 && segmentRatio >= 0 && segmentRatio <= 1) {
      nearestDistance = Math.min(nearestDistance, rayDistance);
    }
  }

  if (!Number.isFinite(nearestDistance)) {
    return getRectChairPosition(table, chair, railGap);
  }

  const distance = nearestDistance + railGap + chairSize / 2;
  return {
    x: center.x + dx * distance - chairSize / 2,
    y: center.y + dy * distance - chairSize / 2,
  };
}

function getTriangleChairAngleFromPoint(table: TableItem, localX: number, localY: number) {
  const center = getTriangleCenter(table);
  return getAngleDeg(center.x, center.y, localX, localY);
}

function getChairPosition(table: TableItem, chair: Chair, railGap: number) {
  if (table.shape === "rect") return getRectChairPosition(table, chair, railGap);
  if (table.shape === "semicircle") return getSemicircleChairPosition(table, chair, railGap);
  if (table.shape === "triangle") return getTriangleChairPosition(table, chair, railGap);
  return getCircleChairPosition(table, chair, railGap);
}

function getHandleCounterRotation(rotation: number) {
  return `rotate(${-rotation}deg)`;
}

function getTableUiScale(table: TableItem) {
  return clamp(Math.min(table.width, table.height) / DEFAULT_TABLE_SIZE, 0.28, 1);
}

function cloneTable(table: TableItem, offset = 0): TableItem {
  return {
    ...table,
    id: crypto.randomUUID(),
    x: table.x + offset,
    y: table.y + offset,
    width: table.shape === "circle" ? table.width : table.width,
    height: table.shape === "circle" ? table.width : table.height,
    chairs: table.chairs.map((chair) => ({ ...chair, id: crypto.randomUUID() })),
  };
}

function cloneObject(object: LayoutObject, offset = 0): LayoutObject {
  return {
    ...object,
    id: crypto.randomUUID(),
    x: object.x + offset,
    y: object.y + offset,
  };
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function TableShapePreview({ shape }: { shape: TableShape }) {
  if (shape === "triangle") {
    return (
      <span
        className="h-12 w-12 border-slate-400 bg-white"
        style={{ clipPath: "polygon(50% 5%, 95% 95%, 5% 95%)", border: "2px solid #94a3b8" }}
      />
    );
  }

  if (shape === "semicircle") {
    return <span className="h-6 w-12 rounded-t-full border-2 border-b-0 border-slate-400 bg-white" />;
  }

  if (shape === "ellipse") {
    return <span className="h-9 w-14 rounded-full border-2 border-slate-400 bg-white" />;
  }

  if (shape === "rect") {
    return <span className="h-12 w-12 rounded-xl border-2 border-slate-400 bg-white" />;
  }

  return <span className="h-12 w-12 rounded-full border-2 border-slate-400 bg-white" />;
}

function TableSurface({ table, activeBorderColor }: { table: TableItem; activeBorderColor: string }) {
  const commonStyle = {
    backgroundColor: isValidHexColor(table.tableColor) ? table.tableColor : DEFAULT_TABLE_COLOR,
    border: `2px solid ${isValidHexColor(table.tableBorderColor) ? table.tableBorderColor : DEFAULT_TABLE_BORDER_COLOR}`,
  };

  if (table.shape === "triangle") {
    return (
      <div
        className="absolute inset-0 shadow-sm"
        style={{
          ...commonStyle,
          clipPath: "polygon(50% 4%, 96% 96%, 4% 96%)",
        }}
      />
    );
  }

  if (table.shape === "semicircle") {
    return <div className="absolute inset-x-0 bottom-0 h-full rounded-t-full shadow-sm" style={commonStyle} />;
  }

  return (
    <div
      className={`absolute inset-0 shadow-sm ${table.shape === "rect" ? "rounded-2xl" : "rounded-full"}`}
      style={commonStyle}
    />
  );
}

function ChairRail({ table, railGap, activeBorderColor }: { table: TableItem; railGap: number; activeBorderColor: string }) {
  const chairSize = getChairSize(table);
  const inset = -(railGap + chairSize / 2);
  const commonStyle = {
    left: inset,
    top: inset,
    width: table.width + (railGap + chairSize / 2) * 2,
    height: table.height + (railGap + chairSize / 2) * 2,
    borderColor: activeBorderColor,
  };

  if (table.shape === "triangle") {
    return (
      <div
        className="pointer-events-none absolute border border-dashed opacity-60"
        style={{ ...commonStyle, clipPath: "polygon(50% 4%, 96% 96%, 4% 96%)" }}
      />
    );
  }

  if (table.shape === "semicircle") {
    return (
      <div
        className="pointer-events-none absolute rounded-t-full border border-dashed border-b-0 opacity-60"
        style={{ ...commonStyle, top: -railGap, height: table.height + railGap + chairSize / 2 }}
      />
    );
  }

  return (
    <div
      className={`pointer-events-none absolute border border-dashed opacity-60 ${table.shape === "rect" ? "rounded-3xl" : "rounded-full"}`}
      style={commonStyle}
    />
  );
}

type Props = {
  /**
   * 編集対象の既存レイアウト。null なら新規モード。
   * Server Component から URL クエリ ?name=XYZ で指定されたものが渡る。
   */
  initialLayout?: Layout | null;
};

export default function SeatLayoutEditor({ initialLayout = null }: Props = {}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tables, setTables] = useState<TableItem[]>(
    () =>
      initialLayout?.tables.map((t) => ({
        ...t,
        kind: "table" as const,
        width: t.shape === "circle" ? Math.max(t.width, t.height) : t.width,
        height: t.shape === "circle" ? Math.max(t.width, t.height) : t.height,
        name: (t as Partial<TableItem>).name ?? "",
        tableBorderColor: (t as Partial<TableItem>).tableBorderColor ?? DEFAULT_TABLE_BORDER_COLOR,
        chairBorderColor: (t as Partial<TableItem>).chairBorderColor ?? DEFAULT_CHAIR_BORDER_COLOR,
        labelColor: (t as Partial<TableItem>).labelColor ?? DEFAULT_LABEL_COLOR,
        chairSizeScale: (t as Partial<TableItem>).chairSizeScale ?? DEFAULT_CHAIR_SIZE_SCALE,
        chairRailGap: (t as Partial<TableItem>).chairRailGap ?? DEFAULT_CHAIR_RAIL_GAP,
      })) ?? [],
  );
  const [objects, setObjects] = useState<LayoutObject[]>(
    () =>
      initialLayout?.objects.map((o) => ({
        ...o,
        kind: "object" as const,
      })) ?? [],
  );
  const [selectedShape, setSelectedShape] = useState<TableShape>("circle");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const initialBackgroundImagePath = (initialLayout as LayoutWithBackground | null)?.backgroundImagePath ?? null;
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialBackgroundImagePath);
  const [backgroundImagePath, setBackgroundImagePath] = useState<string | null>(initialBackgroundImagePath);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [copiedSelection, setCopiedSelection] = useState<CopiedSelection | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [layoutName, setLayoutName] = useState(initialLayout?.name ?? "");
  const [savedLayoutName, setSavedLayoutName] = useState<string | null>(initialLayout?.name ?? null);

  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // ──────────────────────────────────────────────────────────────────
  // 未保存変更の検出 + 離脱警告 (beforeunload)
  // ──────────────────────────────────────────────────────────────────
  /**
   * 現在のレイアウト状態をシリアライズ。
   * 「最後に保存された状態」のスナップショットと比較して未保存変更を検出する。
   * - kind フィールドは保存ペイロードには含まれないので除外して比較する
   * - layoutName は両端空白の影響を消すため trim 比較
   */
  function serializeEditorState() {
    return JSON.stringify({
      tables: tables.map(({ kind: _k, ...rest }) => rest),
      objects: objects.map(({ kind: _k, ...rest }) => rest),
      layoutName: layoutName.trim(),
      backgroundImagePath,
    });
  }
  const savedSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    // 初回マウント時、現在 (= initialLayout 由来) の状態を「保存済み」基準に記録
    savedSnapshotRef.current = serializeEditorState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isDirty =
    savedSnapshotRef.current !== null &&
    savedSnapshotRef.current !== serializeEditorState();

  // タブ閉じ・リロード時の警告 (Chrome は returnValue を入れる必要あり)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ──────────────────────────────────────────────────────────────────
  // 簡易 Undo (Ctrl/Cmd + Z)
  // - tables / objects のスナップショットを最大 30 件保持
  // - 連続したドラッグ更新で履歴が爆発しないよう 350ms debounce
  // - input/textarea フォーカス中はブラウザ標準の undo に任せる
  // ──────────────────────────────────────────────────────────────────
  type EditorSnapshot = { tables: TableItem[]; objects: LayoutObject[] };
  const historyRef = useRef<EditorSnapshot[]>([]);
  const isRestoringRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const next: EditorSnapshot = { tables, objects };
      const last = historyRef.current[historyRef.current.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(next)) return;
      historyRef.current = [...historyRef.current.slice(-29), next];
    }, 350);
  }, [tables, objects]);

  useEffect(() => {
    function onKeyDownUndo(e: KeyboardEvent) {
      const isUndo =
        (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (!isUndo) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return; // テキスト入力中はブラウザ標準の undo に任せる
      }
      e.preventDefault();
      const hist = historyRef.current;
      if (hist.length < 2) return;
      const previous = hist[hist.length - 2];
      historyRef.current = hist.slice(0, -1);
      isRestoringRef.current = true;
      setTables(previous.tables);
      setObjects(previous.objects);
    }
    window.addEventListener("keydown", onKeyDownUndo);
    return () => window.removeEventListener("keydown", onKeyDownUndo);
  }, []);

  const selectedTable = useMemo(
    () => (selectedTableIds.length === 1 ? tables.find((table) => table.id === selectedTableIds[0]) ?? null : null),
    [tables, selectedTableIds],
  );

  const selectedObject = useMemo(
    () => (selectedObjectIds.length === 1 ? objects.find((object) => object.id === selectedObjectIds[0]) ?? null : null),
    [objects, selectedObjectIds],
  );

  const selectedCount = selectedTableIds.length + selectedObjectIds.length;

  function getWorkspacePoint(event: React.PointerEvent | React.DragEvent | PointerEvent) {
    const workspace = workspaceRef.current;
    if (!workspace) return { x: 0, y: 0 };
    const rect = workspace.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / canvasZoom,
      y: (event.clientY - rect.top) / canvasZoom,
    };
  }

  function getViewportCenter(width: number, height: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 120, y: 120 };
    return {
      x: clamp((canvas.scrollLeft + canvas.clientWidth / 2) / canvasZoom - width / 2, 0, WORKSPACE_WIDTH - width),
      y: clamp((canvas.scrollTop + canvas.clientHeight / 2) / canvasZoom - height / 2, 0, WORKSPACE_HEIGHT - height),
    };
  }

  function selectTable(tableId: string, additive = false) {
    if (additive) {
      setSelectedTableIds((prev) => (prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]));
      return;
    }
    setSelectedTableIds([tableId]);
    setSelectedObjectIds([]);
  }

  function selectObject(objectId: string, additive = false) {
    if (additive) {
      setSelectedObjectIds((prev) => (prev.includes(objectId) ? prev.filter((id) => id !== objectId) : [...prev, objectId]));
      return;
    }
    setSelectedObjectIds([objectId]);
    setSelectedTableIds([]);
  }

  function clearSelection() {
    setSelectedTableIds([]);
    setSelectedObjectIds([]);
  }

  function addTableAtCenter(shape: TableShape) {
    const table = createTable(shape, 0, 0);
    const point = getViewportCenter(table.width, table.height);
    const nextTable = { ...table, ...point };

    setTables((prev) => [...prev, nextTable]);
    setSelectedTableIds([nextTable.id]);
    setSelectedObjectIds([]);
  }

  function addObjectAtCenter() {
    const point = getViewportCenter(DEFAULT_OBJECT_WIDTH, DEFAULT_OBJECT_HEIGHT);
    const object = createLayoutObject(point.x, point.y);

    setObjects((prev) => [...prev, object]);
    setSelectedObjectIds([object.id]);
    setSelectedTableIds([]);
  }

  function addItemByDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const itemType = event.dataTransfer.getData("item-type");
    const shape = event.dataTransfer.getData("table-shape") as TableShape;
    const point = getWorkspacePoint(event);

    if (itemType === "table" && TABLE_OPTIONS.some((option) => option.shape === shape)) {
      const table = createTable(shape, Math.max(0, point.x - DEFAULT_TABLE_SIZE / 2), Math.max(0, point.y - DEFAULT_TABLE_SIZE / 2));
      setTables((prev) => [...prev, table]);
      setSelectedTableIds([table.id]);
      setSelectedObjectIds([]);
      return;
    }

    if (itemType === "object") {
      const object = createLayoutObject(Math.max(0, point.x - DEFAULT_OBJECT_WIDTH / 2), Math.max(0, point.y - DEFAULT_OBJECT_HEIGHT / 2));
      setObjects((prev) => [...prev, object]);
      setSelectedObjectIds([object.id]);
      setSelectedTableIds([]);
    }
  }

  function updateTable(tableId: string, updater: (table: TableItem) => TableItem) {
    setTables((prev) => prev.map((table) => (table.id === tableId ? updater(table) : table)));
  }

  function updateObject(objectId: string, updater: (object: LayoutObject) => LayoutObject) {
    setObjects((prev) => prev.map((object) => (object.id === objectId ? updater(object) : object)));
  }

  function changeChairCount(tableId: string, delta: number) {
    updateTable(tableId, (table) => {
      const nextCount = Math.max(0, Math.min(24, table.chairs.length + delta));

      if (nextCount > table.chairs.length) {
        const added = Array.from({ length: nextCount - table.chairs.length }, (_, index) => ({
          id: crypto.randomUUID(),
          angle:
            table.shape === "semicircle"
              ? 180 + ((table.chairs.length + index + 1) * 180) / (nextCount + 1)
              : normalizeAngle(-90 + ((table.chairs.length + index) * 360) / nextCount),
        }));
        return { ...table, chairs: [...table.chairs, ...added] };
      }

      return { ...table, chairs: table.chairs.slice(0, nextCount) };
    });
  }

  function changeSelectedTableColor(key: "tableColor" | "chairColor" | "tableBorderColor" | "chairBorderColor" | "labelColor", rawColor: string) {
    if (!selectedTable) return;
    const color = normalizeHexInput(rawColor);
    updateTable(selectedTable.id, (table) => ({ ...table, [key]: color }));
  }

  function commitSelectedTableColor(key: "tableColor" | "chairColor" | "tableBorderColor" | "chairBorderColor" | "labelColor", rawColor: string) {
    if (!selectedTable) return;
    const color = normalizeHexInput(rawColor);
    if (!isValidHexColor(color)) return;
    updateTable(selectedTable.id, (table) => ({ ...table, [key]: color }));
  }

  function changeSelectedObjectColor(rawColor: string) {
    if (!selectedObject) return;
    const color = normalizeHexInput(rawColor);
    updateObject(selectedObject.id, (object) => ({ ...object, color }));
  }

  function commitSelectedObjectColor(rawColor: string) {
    if (!selectedObject) return;
    const color = normalizeHexInput(rawColor);
    if (!isValidHexColor(color)) return;
    updateObject(selectedObject.id, (object) => ({ ...object, color }));
  }

  function getCurrentSelectionOrigins(nextTableIds = selectedTableIds, nextObjectIds = selectedObjectIds) {
    return {
      tableOrigins: tables
        .filter((table) => nextTableIds.includes(table.id))
        .map((table) => ({ id: table.id, x: table.x, y: table.y })),
      objectOrigins: objects
        .filter((object) => nextObjectIds.includes(object.id))
        .map((object) => ({ id: object.id, x: object.x, y: object.y })),
    };
  }

  function startMoveSelection(event: React.PointerEvent, nextTableIds = selectedTableIds, nextObjectIds = selectedObjectIds) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPointerPoint(event);
    const origins = getCurrentSelectionOrigins(nextTableIds, nextObjectIds);

    setSelectedTableIds(nextTableIds);
    setSelectedObjectIds(nextObjectIds);
    setDragMode({
      type: "move-selection",
      startX: point.x,
      startY: point.y,
      tableOrigins: origins.tableOrigins,
      objectOrigins: origins.objectOrigins,
    });
  }

  function copySelectedItems() {
    const selectedTables = tables.filter((table) => selectedTableIds.includes(table.id));
    const selectedObjects = objects.filter((object) => selectedObjectIds.includes(object.id));
    if (selectedTables.length === 0 && selectedObjects.length === 0) return;
    setCopiedSelection({ tables: selectedTables, objects: selectedObjects });
  }

  function pasteCopiedItems() {
    if (!copiedSelection || (copiedSelection.tables.length === 0 && copiedSelection.objects.length === 0)) return;

    const pastedTables = copiedSelection.tables.map((table) => cloneTable(table, PASTE_OFFSET));
    const pastedObjects = copiedSelection.objects.map((object) => cloneObject(object, PASTE_OFFSET));

    setTables((prev) => [...prev, ...pastedTables]);
    setObjects((prev) => [...prev, ...pastedObjects]);
    setSelectedTableIds(pastedTables.map((table) => table.id));
    setSelectedObjectIds(pastedObjects.map((object) => object.id));
    setCopiedSelection({ tables: pastedTables, objects: pastedObjects });
  }

  function duplicateSelectedItems() {
    copySelectedItems();
    const selectedTables = tables.filter((table) => selectedTableIds.includes(table.id));
    const selectedObjects = objects.filter((object) => selectedObjectIds.includes(object.id));
    if (selectedTables.length === 0 && selectedObjects.length === 0) return;

    const pastedTables = selectedTables.map((table) => cloneTable(table, PASTE_OFFSET));
    const pastedObjects = selectedObjects.map((object) => cloneObject(object, PASTE_OFFSET));
    setTables((prev) => [...prev, ...pastedTables]);
    setObjects((prev) => [...prev, ...pastedObjects]);
    setSelectedTableIds(pastedTables.map((table) => table.id));
    setSelectedObjectIds(pastedObjects.map((object) => object.id));
    setCopiedSelection({ tables: pastedTables, objects: pastedObjects });
  }

  function removeSelectedItems() {
    if (selectedCount === 0) return;
    setTables((prev) => prev.filter((table) => !selectedTableIds.includes(table.id)));
    setObjects((prev) => prev.filter((object) => !selectedObjectIds.includes(object.id)));
    clearSelection();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragMode) return;

    const point = getPointerPoint(event);

    if (dragMode.type === "move-selection") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      setTables((prev) =>
        prev.map((table) => {
          const origin = dragMode.tableOrigins.find((item) => item.id === table.id);
          return origin ? { ...table, x: origin.x + dx, y: origin.y + dy } : table;
        }),
      );
      setObjects((prev) =>
        prev.map((object) => {
          const origin = dragMode.objectOrigins.find((item) => item.id === object.id);
          return origin ? { ...object, x: origin.x + dx, y: origin.y + dy } : object;
        }),
      );
    }

    if (dragMode.type === "resize-table") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      updateTable(dragMode.tableId, (table) => {
        if (table.shape === "circle") {
          const nextSize = Math.max(MIN_TABLE_SIZE, dragMode.originW + Math.max(dx, dy));
          return { ...table, width: nextSize, height: nextSize };
        }
        return {
          ...table,
          width: Math.max(MIN_TABLE_SIZE, dragMode.originW + dx),
          height: Math.max(MIN_TABLE_SIZE, dragMode.originH + dy),
        };
      });
    }

    if (dragMode.type === "rotate-table") {
      const currentAngle = getAngleDeg(dragMode.centerX, dragMode.centerY, point.x, point.y);
      updateTable(dragMode.tableId, (table) => ({
        ...table,
        rotation: dragMode.startRotation + currentAngle - dragMode.startAngle,
      }));
    }

    if (dragMode.type === "slide-chair") {
      const table = tables.find((item) => item.id === dragMode.tableId);
      if (!table) return;

      const workspacePoint = getWorkspacePoint(event);
      const tableCenterX = table.x + table.width / 2;
      const tableCenterY = table.y + table.height / 2;
      const unrotatedPoint = rotatePoint(workspacePoint.x - tableCenterX, workspacePoint.y - tableCenterY, -table.rotation);
      const localX = unrotatedPoint.x + table.width / 2;
      const localY = unrotatedPoint.y + table.height / 2;
      const rawAngle = getAngleDeg(0, 0, unrotatedPoint.x, unrotatedPoint.y);
      const nextAngle =
        table.shape === "semicircle"
          ? getSemicircleChairAngleFromPoint(table, localX, localY)
          : table.shape === "triangle"
            ? getTriangleChairAngleFromPoint(table, localX, localY)
            : rawAngle;

      updateTable(dragMode.tableId, (current) => ({
        ...current,
        chairs: current.chairs.map((chair) => (chair.id === dragMode.chairId ? { ...chair, angle: nextAngle } : chair)),
      }));
    }

    if (dragMode.type === "resize-object") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      updateObject(dragMode.objectId, (object) => ({
        ...object,
        width: Math.max(MIN_OBJECT_SIZE, dragMode.originW + dx),
        height: Math.max(MIN_OBJECT_SIZE, dragMode.originH + dy),
      }));
    }

    if (dragMode.type === "rotate-object") {
      const currentAngle = getAngleDeg(dragMode.centerX, dragMode.centerY, point.x, point.y);
      updateObject(dragMode.objectId, (object) => ({
        ...object,
        rotation: dragMode.startRotation + currentAngle - dragMode.startAngle,
      }));
    }
  }

  function endDrag() {
    setDragMode(null);
  }

  function uploadBackgroundImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setBackgroundImage((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return imageUrl;
    });
    setBackgroundImageFile(file);
    setBackgroundImagePath(null);
  }

  function removeBackgroundImage() {
    setBackgroundImage((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
    setBackgroundImageFile(null);
    setBackgroundImagePath(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function changeZoom(delta: number) {
    setCanvasZoom((current) => Number(clamp(current + delta, CANVAS_ZOOM_MIN, CANVAS_ZOOM_MAX).toFixed(2)));
  }

  useEffect(() => {
    return () => {
      if (backgroundImage?.startsWith("blob:")) URL.revokeObjectURL(backgroundImage);
    };
  }, [backgroundImage]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableElement(event.target)) return;

      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isModifier && key === "c") {
        event.preventDefault();
        copySelectedItems();
        return;
      }

      if (isModifier && key === "v") {
        event.preventDefault();
        pasteCopiedItems();
        return;
      }

      if (isModifier && key === "d") {
        event.preventDefault();
        duplicateSelectedItems();
        return;
      }

      if (isModifier && key === "a") {
        event.preventDefault();
        setSelectedTableIds(tables.map((table) => table.id));
        setSelectedObjectIds(objects.map((object) => object.id));
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelectedItems();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copiedSelection, objects, selectedCount, selectedObjectIds, selectedTableIds, tables]);

  /**
   * レイアウトの保存。
   * - allowOverwrite=false で呼ばれた時、同名レイアウトが既にあれば
   *   { conflict: true } が返ってくるので、上書き確認ダイアログを開く。
   * - allowOverwrite=true なら強制上書き。
   */
  function performSaveLayout(allowOverwrite = false) {
    const name = layoutName.trim();
    if (!name) {
      setSaveError("レイアウト名を入力してください");
      return;
    }
    setSaveError(null);

    startSaveTransition(async () => {
      try {
        const nextBackgroundImagePath = backgroundImageFile ? await uploadLayoutBackground(backgroundImageFile) : backgroundImagePath;
        const payloadTables = tables.map(({ kind: _kind, ...rest }) => rest);
        const payloadObjects = objects.map(({ kind: _kind, ...rest }) => rest);

        const result = await saveLayout(
          {
            name,
            isFavorite: initialLayout?.isFavorite ?? false,
            backgroundImagePath: nextBackgroundImagePath,
            tables: payloadTables,
            objects: payloadObjects,
          } as LayoutWithBackground,
          allowOverwrite,
        );

        if (result.conflict) {
          setConfirmOverwrite(true);
          return;
        }
        setBackgroundImagePath(nextBackgroundImagePath);
        setBackgroundImageFile(null);
        setConfirmOverwrite(false);
        setIsSaveModalOpen(false);
        setSavedLayoutName(result.saved.name);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // 保存に成功したので「保存済み基準」のスナップショットを更新。
        // 以降、ユーザーが手を加えるまで isDirty = false (= 離脱警告も出ない)。
        savedSnapshotRef.current = JSON.stringify({
          tables: payloadTables,
          objects: payloadObjects,
          layoutName: result.saved.name,
          backgroundImagePath: nextBackgroundImagePath,
        });
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "レイアウトの保存に失敗しました");
      }
    });
  }

  return (
    <div className="h-screen overflow-hidden bg-background sm:px-2 sm:py-6 text-foreground">
      <h1 className="text-xl font-bold text-shuffle">座席レイアウト</h1>

      <div className="mt-4 flex h-[calc(100vh-76px)] gap-5">
        <main className="flex h-full min-w-0 flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold">キャンバス</p>
              <p className="text-xs text-slate-500">
                背景画像・テーブル・椅子・オブジェクトを同じ倍率で拡大縮小します。
              </p>
              {savedLayoutName && !isDirty && (
                <p className="mt-1 text-xs font-medium text-blue-700">
                  「{savedLayoutName}」として保存済み
                </p>
              )}
              {isDirty && (
                <p className="mt-1 text-xs font-medium text-flamingo">
                  <span className="mr-1">●</span>
                  未保存の変更があります (Ctrl+Z で 1 つ戻す)
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => changeZoom(-CANVAS_ZOOM_STEP)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-lg font-bold hover:bg-slate-50"
                aria-label="ズームアウト"
                title="ズームアウト"
              >
                −
              </button>
              <span className="min-w-14 text-center text-sm font-semibold">{Math.round(canvasZoom * 100)}%</span>
              <button
                onClick={() => changeZoom(CANVAS_ZOOM_STEP)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-lg font-bold hover:bg-slate-50"
                aria-label="ズームイン"
                title="ズームイン"
              >
                ＋
              </button>
              <button
                onClick={() => setCanvasZoom(1)}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                100%
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            onDrop={addItemByDrop}
            onDragOver={(event) => event.preventDefault()}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) clearSelection();
            }}
            className="relative min-h-0 w-full flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className="relative"
              style={{
                width: WORKSPACE_WIDTH * canvasZoom,
                height: WORKSPACE_HEIGHT * canvasZoom,
              }}
            >
              <div
                ref={workspaceRef}
                className="absolute left-0 top-0 z-10 origin-top-left"
                style={{
                  width: WORKSPACE_WIDTH,
                  height: WORKSPACE_HEIGHT,
                  transform: `scale(${canvasZoom})`,
                }}
              >
                {backgroundImage ? (
                  <img
                    src={backgroundImage}
                    alt="キャンバス背景"
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px]" />
                )}

                {objects.map((object) => {
                  const isSelected = selectedObjectIds.includes(object.id);
                  const isOperating =
                    (dragMode?.type === "resize-object" && dragMode.objectId === object.id) ||
                    (dragMode?.type === "rotate-object" && dragMode.objectId === object.id) ||
                    (dragMode?.type === "move-selection" && dragMode.objectOrigins.some((item) => item.id === object.id));
                  const activeBorderColor = isSelected || isOperating ? (selectedCount > 1 ? MULTI_BORDER : ACTIVE_BORDER) : IDLE_BORDER;
                  const counterRotation = getHandleCounterRotation(object.rotation);
                  const objectUiScale = clamp(Math.min(object.width / DEFAULT_OBJECT_WIDTH, object.height / DEFAULT_OBJECT_HEIGHT), 0.35, 1);
                  const nextObjectIds = isSelected ? selectedObjectIds : [object.id];
                  const nextTableIds = isSelected ? selectedTableIds : [];

                  return (
                    <div
                      key={object.id}
                      className="absolute select-none"
                      style={{
                        left: object.x,
                        top: object.y,
                        width: object.width,
                        height: object.height,
                        transform: `rotate(${object.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        selectObject(object.id, event.shiftKey || event.metaKey || event.ctrlKey);
                      }}
                    >
                      <div
                        className="relative grid h-full w-full place-items-center rounded-2xl shadow-sm"
                        style={{
                          backgroundColor: isValidHexColor(object.color) ? object.color : DEFAULT_OBJECT_COLOR,
                          border: `2px solid ${activeBorderColor}`,
                        }}
                      >
                        <div
                          className="max-w-[90%] rounded-lg bg-white/80 px-3 py-1 text-center text-sm font-bold text-slate-800 shadow-sm"
                          style={{ transform: `${counterRotation} scale(${objectUiScale})`, transformOrigin: "center center" }}
                        >
                          {object.name || "オブジェクト"}
                        </div>

                        {(isSelected || isOperating) && (
                          <>
                            <button
                              onPointerDown={(event) => startMoveSelection(event, nextTableIds, nextObjectIds)}
                              className="absolute -bottom-14 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                              style={{ transform: `translateX(-50%) ${counterRotation}` }}
                              aria-label="選択中の要素を移動"
                              title="移動"
                            >
                              ✣
                            </button>

                            <button
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(event.pointerId);
                                const point = getPointerPoint(event);
                                const workspace = workspaceRef.current;
                                if (!workspace) return;
                                const rect = workspace.getBoundingClientRect();
                                const centerX = rect.left + (object.x + object.width / 2) * canvasZoom;
                                const centerY = rect.top + (object.y + object.height / 2) * canvasZoom;
                                setSelectedObjectIds([object.id]);
                                setSelectedTableIds([]);
                                setDragMode({
                                  type: "rotate-object",
                                  objectId: object.id,
                                  centerX,
                                  centerY,
                                  startRotation: object.rotation,
                                  startAngle: getAngleDeg(centerX, centerY, point.x, point.y),
                                });
                              }}
                              className="absolute -bottom-14 left-[calc(50%+50px)] z-20 grid h-10 w-10 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                              style={{ transform: counterRotation }}
                              aria-label="オブジェクトを回転"
                              title="回転"
                            >
                              ↻
                            </button>
                          </>
                        )}

                        <span
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            const point = getPointerPoint(event);
                            setSelectedObjectIds([object.id]);
                            setSelectedTableIds([]);
                            setDragMode({
                              type: "resize-object",
                              objectId: object.id,
                              startX: point.x,
                              startY: point.y,
                              originW: object.width,
                              originH: object.height,
                            });
                          }}
                          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-nwse-resize rounded-full shadow-sm ring-2 ring-white"
                          style={{
                            backgroundColor: activeBorderColor,
                            transform: `translate(50%, 50%) ${counterRotation}`,
                          }}
                          aria-label="サイズ変更"
                        />
                      </div>
                    </div>
                  );
                })}

                {tables.map((table) => {
                  const isSelected = selectedTableIds.includes(table.id);
                  const isOperating =
                    (dragMode?.type === "resize-table" && dragMode.tableId === table.id) ||
                    (dragMode?.type === "rotate-table" && dragMode.tableId === table.id) ||
                    (dragMode?.type === "slide-chair" && dragMode.tableId === table.id) ||
                    (dragMode?.type === "move-selection" && dragMode.tableOrigins.some((item) => item.id === table.id));
                  const activeBorderColor = isSelected || isOperating ? (selectedCount > 1 ? MULTI_BORDER : ACTIVE_BORDER) : IDLE_BORDER;
                  const counterRotation = getHandleCounterRotation(table.rotation);
                  const uiScale = getTableUiScale(table);
                  const chairSize = getChairSize(table);
                  const tableChairRailGap = getChairRailGap(table);
                  const nextTableIds = isSelected ? selectedTableIds : [table.id];
                  const nextObjectIds = isSelected ? selectedObjectIds : [];

                  return (
                    <div
                      key={table.id}
                      className="absolute select-none"
                      style={{
                        left: table.x,
                        top: table.y,
                        width: table.width,
                        height: table.height,
                        transform: `rotate(${table.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        selectTable(table.id, event.shiftKey || event.metaKey || event.ctrlKey);
                      }}
                    >
                      {isSelected && <ChairRail table={table} railGap={tableChairRailGap} activeBorderColor={activeBorderColor} />}

                      {table.chairs.map((chair) => {
                        const chairPos = getChairPosition(table, chair, tableChairRailGap);
                        const isChairOperating =
                          dragMode?.type === "slide-chair" && dragMode.tableId === table.id && dragMode.chairId === chair.id;

                        return (
                          <button
                            key={chair.id}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(event.pointerId);
                              setSelectedTableIds([table.id]);
                              setSelectedObjectIds([]);
                              setDragMode({ type: "slide-chair", tableId: table.id, chairId: chair.id });
                            }}
                            className="absolute z-10 cursor-grab rounded-full font-bold active:cursor-grabbing"
                            style={{
                              left: chairPos.x,
                              top: chairPos.y,
                              width: chairSize,
                              height: chairSize,
                              fontSize: Math.max(10, chairSize * 0.42),
                              backgroundColor: isValidHexColor(table.chairColor) ? table.chairColor : DEFAULT_CHAIR_COLOR,
                              border: `2px solid ${isValidHexColor(table.chairBorderColor) ? table.chairBorderColor : DEFAULT_CHAIR_BORDER_COLOR}`,
                              color: isValidHexColor(table.labelColor) ? table.labelColor : DEFAULT_LABEL_COLOR,
                              boxShadow: isChairOperating ? `0 0 0 3px ${ACTIVE_BORDER}33` : undefined,
                              transform: counterRotation,
                            }}
                            aria-label="椅子をスライド"
                          >
                            椅
                          </button>
                        );
                      })}

                      <div className="relative flex h-full w-full items-center justify-center">
                        <TableSurface table={table} activeBorderColor={activeBorderColor} />

                        {/* テーブル名 + 椅子数コントロールを縦に積んで中央配置。
                            (テーブル名はテーブル中央、その下に「− 数字 ＋」) */}
                        <div
                          className="relative z-10 flex flex-col items-center gap-1"
                          style={{
                            transform: `${counterRotation} scale(${uiScale})`,
                            transformOrigin: "center center",
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          {table.name.trim() && (
                            <div
                              className="pointer-events-none max-w-45 truncate rounded bg-white/85 px-2 py-0.5 text-center text-xs font-bold shadow-sm"
                              style={{
                                color: isValidHexColor(table.labelColor)
                                  ? table.labelColor
                                  : DEFAULT_LABEL_COLOR,
                              }}
                            >
                              {table.name}
                            </div>
                          )}

                        <div
                          className="flex items-center overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm"
                          style={{
                            color: isValidHexColor(table.labelColor) ? table.labelColor : DEFAULT_LABEL_COLOR,
                          }}
                        >
                          <button
                            onClick={() => changeChairCount(table.id, 1)}
                            className="px-3 py-1 text-lg font-bold hover:bg-slate-100"
                            aria-label="椅子を増やす"
                          >
                            ＋
                          </button>
                          <span className="min-w-8 border-x border-slate-200 px-2 text-center text-sm font-bold">{table.chairs.length}</span>
                          <button
                            onClick={() => changeChairCount(table.id, -1)}
                            className="px-3 py-1 text-lg font-bold hover:bg-slate-100"
                            aria-label="椅子を減らす"
                          >
                            －
                          </button>
                        </div>
                        </div>

                        {(isSelected || isOperating) && (
                          <>
                            <button
                              onPointerDown={(event) => startMoveSelection(event, nextTableIds, nextObjectIds)}
                              className="absolute -bottom-14 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                              style={{ transform: `translateX(-50%) ${counterRotation} scale(${uiScale})`, transformOrigin: "center center" }}
                              aria-label="選択中の要素を移動"
                              title="移動"
                            >
                              ✣
                            </button>

                            <button
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(event.pointerId);
                                const point = getPointerPoint(event);
                                const workspace = workspaceRef.current;
                                if (!workspace) return;
                                const rect = workspace.getBoundingClientRect();
                                const centerX = rect.left + (table.x + table.width / 2) * canvasZoom;
                                const centerY = rect.top + (table.y + table.height / 2) * canvasZoom;
                                setSelectedTableIds([table.id]);
                                setSelectedObjectIds([]);
                                setDragMode({
                                  type: "rotate-table",
                                  tableId: table.id,
                                  centerX,
                                  centerY,
                                  startRotation: table.rotation,
                                  startAngle: getAngleDeg(centerX, centerY, point.x, point.y),
                                });
                              }}
                              className="absolute -bottom-14 left-[calc(50%+50px)] z-20 grid h-10 w-10 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                              style={{ transform: `${counterRotation} scale(${uiScale})`, transformOrigin: "center center" }}
                              aria-label="テーブルを回転"
                              title="回転"
                            >
                              ↻
                            </button>
                          </>
                        )}

                        <span
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            const point = getPointerPoint(event);
                            setSelectedTableIds([table.id]);
                            setSelectedObjectIds([]);
                            setDragMode({
                              type: "resize-table",
                              tableId: table.id,
                              startX: point.x,
                              startY: point.y,
                              originW: table.width,
                              originH: table.height,
                            });
                          }}
                          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-nwse-resize rounded-full shadow-sm ring-2 ring-white"
                          style={{
                            backgroundColor: activeBorderColor,
                            transform: `translate(50%, 50%) ${counterRotation}`,
                          }}
                          aria-label="サイズ変更"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        <div className="flex h-full w-72 shrink-0 flex-col gap-3">
          <button
            onClick={() => {
              setSaveError(null);
              setIsSaveModalOpen(true);
            }}
            className="w-full rounded-2xl bg-shuffle px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-shuffle-deep"
          >
            レイアウトを保存
          </button>

          <aside className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <div>
                <p className="text-sm font-semibold">テーブルの図形選択</p>
                <p className="mt-1 text-xs text-slate-500">図形を選んで追加、またはキャンバスへドラッグします。</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TABLE_OPTIONS.map((option) => (
                  <button
                    key={option.shape}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("item-type", "table");
                      event.dataTransfer.setData("table-shape", option.shape);
                    }}
                    onClick={() => setSelectedShape(option.shape)}
                    className={`grid h-24 place-items-center rounded-xl border p-3 transition ${
                      selectedShape === option.shape ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:bg-slate-50"
                    }`}
                    aria-label={`${option.label}を選択`}
                    title={option.label}
                  >
                    <TableShapePreview shape={option.shape} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => addTableAtCenter(selectedShape)}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
            >
              選択中のテーブルを追加
            </button>

            <div className="mt-6 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">オブジェクト追加</p>
              <p className="mt-1 text-xs text-slate-500">ステージ、受付など座席以外の要素を配置します。</p>
              <button
                draggable
                onDragStart={(event) => event.dataTransfer.setData("item-type", "object")}
                onClick={addObjectAtCenter}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-slate-400 bg-slate-100 text-xs font-bold">OBJ</span>
                <span>
                  <span className="block font-semibold">オブジェクトを追加</span>
                  <span className="text-xs text-slate-500">ドラッグでも配置できます</span>
                </span>
              </button>
            </div>

            {selectedObject && (
              <div className="mt-5 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold">選択中のオブジェクト</p>
                <p className="mt-1 text-xs text-slate-500">
                  名前・色を編集します。サイズ変更と回転はキャンバス上で操作します。
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {Math.round(selectedObject.width)} × {Math.round(selectedObject.height)} / {Math.round(selectedObject.rotation)}°
                </p>

                <label className="mt-4 block text-sm font-medium">
                  名前
                  <input
                    value={selectedObject.name}
                    onChange={(event) => updateObject(selectedObject.id, (object) => ({ ...object, name: event.target.value }))}
                    placeholder="ステージ、ピアノ、受付など"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <div className="mt-4 space-y-2">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">色</span>
                    <input
                      type="color"
                      value={isValidHexColor(selectedObject.color) ? selectedObject.color : DEFAULT_OBJECT_COLOR}
                      onChange={(event) => commitSelectedObjectColor(event.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                    />
                  </label>
                  <input
                    value={selectedObject.color}
                    onChange={(event) => changeSelectedObjectColor(event.target.value)}
                    onBlur={(event) => commitSelectedObjectColor(event.target.value)}
                    placeholder="#e5e7eb"
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                      isValidHexColor(selectedObject.color) ? "border-slate-200" : "border-red-300"
                    }`}
                  />
                </div>
              </div>
            )}

            {selectedTable ? (
              <div className="mt-6 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold">選択中のテーブルの操作</p>
                <p className="mt-1 text-xs text-slate-500">名前、椅子、色、枠線、文字色を調整します。</p>
                <p className="mt-2 text-xs text-slate-500">
                  {Math.round(selectedTable.width)} × {Math.round(selectedTable.height)} / {Math.round(selectedTable.rotation)}°
                </p>

                <div className="mt-4 space-y-4">
                  <label className="block text-sm font-medium">
                    テーブル名
                    <input
                      value={selectedTable.name}
                      maxLength={10}
                      onChange={(event) => {
                        // 全角=2バイト・半角=1バイト換算で 10 バイト超過分は切る
                        let next = event.target.value;
                        const byteLen = (s: string) =>
                          [...s].reduce(
                            (acc, ch) =>
                              acc + (ch.charCodeAt(0) > 0x7f ? 2 : 1),
                            0,
                          );
                        while (byteLen(next) > 10 && next.length > 0) {
                          next = next.slice(0, -1);
                        }
                        updateTable(selectedTable.id, (table) => ({
                          ...table,
                          name: next,
                        }));
                      }}
                      placeholder="例：A卓、親族席、受付横"
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-shuffle-tint"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">椅子サイズ</span>
                      <span className="text-xs font-semibold text-slate-600">{Math.round((selectedTable.chairSizeScale ?? DEFAULT_CHAIR_SIZE_SCALE) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_CHAIR_SIZE_SCALE}
                      max={MAX_CHAIR_SIZE_SCALE}
                      step={0.05}
                      value={selectedTable.chairSizeScale ?? DEFAULT_CHAIR_SIZE_SCALE}
                      onChange={(event) =>
                        updateTable(selectedTable.id, (table) => ({
                          ...table,
                          chairSizeScale: Number(event.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">椅子スライド線</span>
                      <span className="text-xs font-semibold text-slate-600">{Math.round(selectedTable.chairRailGap ?? DEFAULT_CHAIR_RAIL_GAP)}px</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_CHAIR_RAIL_GAP}
                      max={MAX_CHAIR_RAIL_GAP}
                      step={2}
                      value={selectedTable.chairRailGap ?? DEFAULT_CHAIR_RAIL_GAP}
                      onChange={(event) =>
                        updateTable(selectedTable.id, (table) => ({
                          ...table,
                          chairRailGap: Number(event.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">テーブル色</span>
                      <input
                        type="color"
                        value={isValidHexColor(selectedTable.tableColor) ? selectedTable.tableColor : DEFAULT_TABLE_COLOR}
                        onChange={(event) => commitSelectedTableColor("tableColor", event.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                    </label>
                    <input
                      value={selectedTable.tableColor}
                      onChange={(event) => changeSelectedTableColor("tableColor", event.target.value)}
                      onBlur={(event) => commitSelectedTableColor("tableColor", event.target.value)}
                      placeholder="#fde68a"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                        isValidHexColor(selectedTable.tableColor) ? "border-slate-200" : "border-red-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">椅子色</span>
                      <input
                        type="color"
                        value={isValidHexColor(selectedTable.chairColor) ? selectedTable.chairColor : DEFAULT_CHAIR_COLOR}
                        onChange={(event) => commitSelectedTableColor("chairColor", event.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                    </label>
                    <input
                      value={selectedTable.chairColor}
                      onChange={(event) => changeSelectedTableColor("chairColor", event.target.value)}
                      onBlur={(event) => commitSelectedTableColor("chairColor", event.target.value)}
                      placeholder="#bbf7d0"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                        isValidHexColor(selectedTable.chairColor) ? "border-slate-200" : "border-red-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">テーブル枠線色</span>
                      <input
                        type="color"
                        value={isValidHexColor(selectedTable.tableBorderColor) ? selectedTable.tableBorderColor : DEFAULT_TABLE_BORDER_COLOR}
                        onChange={(event) => commitSelectedTableColor("tableBorderColor", event.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                    </label>
                    <input
                      value={selectedTable.tableBorderColor}
                      onChange={(event) => changeSelectedTableColor("tableBorderColor", event.target.value)}
                      onBlur={(event) => commitSelectedTableColor("tableBorderColor", event.target.value)}
                      placeholder="#9ca3af"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                        isValidHexColor(selectedTable.tableBorderColor) ? "border-slate-200" : "border-red-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">椅子枠線色</span>
                      <input
                        type="color"
                        value={isValidHexColor(selectedTable.chairBorderColor) ? selectedTable.chairBorderColor : DEFAULT_CHAIR_BORDER_COLOR}
                        onChange={(event) => commitSelectedTableColor("chairBorderColor", event.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                    </label>
                    <input
                      value={selectedTable.chairBorderColor}
                      onChange={(event) => changeSelectedTableColor("chairBorderColor", event.target.value)}
                      onBlur={(event) => commitSelectedTableColor("chairBorderColor", event.target.value)}
                      placeholder="#9ca3af"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                        isValidHexColor(selectedTable.chairBorderColor) ? "border-slate-200" : "border-red-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">名前・文字色</span>
                      <input
                        type="color"
                        value={isValidHexColor(selectedTable.labelColor) ? selectedTable.labelColor : DEFAULT_LABEL_COLOR}
                        onChange={(event) => commitSelectedTableColor("labelColor", event.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                      />
                    </label>
                    <input
                      value={selectedTable.labelColor}
                      onChange={(event) => changeSelectedTableColor("labelColor", event.target.value)}
                      onBlur={(event) => commitSelectedTableColor("labelColor", event.target.value)}
                      placeholder="#334155"
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                        isValidHexColor(selectedTable.labelColor) ? "border-slate-200" : "border-red-300"
                      }`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-3">
                <p className="text-sm font-semibold text-slate-700">選択中のテーブルの操作</p>
                <p className="mt-1 text-xs text-slate-500">テーブルを1つ選択すると、名前・椅子・色・枠線・文字色を編集できます。</p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">選択・編集</p>
              <p className="mt-1 text-xs text-slate-500">Shift / Ctrl / ⌘クリックで複数選択。十字でまとめて移動できます。</p>
              <p className="mt-2 text-xs font-medium text-slate-700">選択中: {selectedCount} 件</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={copySelectedItems}
                  disabled={selectedCount === 0}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  コピー
                </button>
                <button
                  onClick={pasteCopiedItems}
                  disabled={!copiedSelection}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ペースト
                </button>
                <button
                  onClick={duplicateSelectedItems}
                  disabled={selectedCount === 0}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  複製
                </button>
                <button
                  onClick={removeSelectedItems}
                  disabled={selectedCount === 0}
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  削除
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Ctrl/⌘ + C/V/D/A、Delete も使えます。</p>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">背景画像</p>
              <p className="mt-1 text-xs text-slate-500">保存時に layouts-bg へアップロードし、JSONにパスを保存します。</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadBackgroundImage}
                className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
              {backgroundImage && (
                <>
                  {backgroundImagePath && (
                    <p className="mt-2 break-all text-[11px] text-slate-500">保存先: {backgroundImagePath}</p>
                  )}
                  {backgroundImageFile && (
                    <p className="mt-2 text-[11px] text-slate-500">未保存の背景画像があります。保存時にアップロードします。</p>
                  )}
                  <button
                    onClick={removeBackgroundImage}
                    className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    背景画像を削除
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">レイアウトを保存</h2>
                <p className="mt-1 text-sm text-slate-500">レイアウト名を入力して保存します。</p>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold">
              レイアウト名
              <input
                autoFocus
                value={layoutName}
                onChange={(event) => setLayoutName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") performSaveLayout(false);
                }}
                placeholder="例：披露宴 A会場 / 2026 春イベント"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-shuffle focus:ring-4 focus:ring-shuffle-tint"
              />
            </label>
            {saveError && <p className="mt-2 text-xs font-medium text-flamingo">{saveError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => performSaveLayout(false)}
                disabled={!layoutName.trim() || isSaving}
                className="rounded-xl bg-shuffle px-4 py-2 text-sm font-semibold text-white hover:bg-shuffle-deep disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOverwrite}
        message="既に同じ名前のレイアウトが存在します。上書きしますか?"
        onConfirm={() => performSaveLayout(true)}
        onCancel={() => setConfirmOverwrite(false)}
        isPending={isSaving}
      />
    </div>
  );
}
