"use client";

import React, { useMemo, useRef, useState } from "react";

type TableShape = "circle" | "rect" | "semicircle" | "triangle" | "ellipse";
type LayoutObjectShape = "rect" | "circle";

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
  tableColor: string;
  chairColor: string;
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

type DragMode =
  | { type: "move-table"; tableId: string; startX: number; startY: number; originX: number; originY: number }
  | { type: "resize-table"; tableId: string; startX: number; startY: number; originW: number; originH: number }
  | { type: "rotate-table"; tableId: string; centerX: number; centerY: number; startRotation: number; startAngle: number }
  | { type: "slide-chair"; tableId: string; chairId: string }
  | { type: "move-object"; objectId: string; startX: number; startY: number; originX: number; originY: number }
  | { type: "resize-object"; objectId: string; startX: number; startY: number; originW: number; originH: number }
  | { type: "rotate-object"; objectId: string; centerX: number; centerY: number; startRotation: number; startAngle: number }
  | null;

const MIN_TABLE_SIZE = 72;
const MIN_OBJECT_SIZE = 48;
const DEFAULT_TABLE_SIZE = 150;
const DEFAULT_OBJECT_WIDTH = 180;
const DEFAULT_OBJECT_HEIGHT = 90;
const CHAIR_SIZE = 30;
const CHAIR_GAP = 18;
const DEFAULT_TABLE_COLOR = "#fde68a";
const DEFAULT_CHAIR_COLOR = "#bbf7d0";
const DEFAULT_OBJECT_COLOR = "#e5e7eb";
const IDLE_BORDER = "#9ca3af";
const ACTIVE_BORDER = "#2563eb";
const CANVAS_ZOOM_MIN = 0.5;
const CANVAS_ZOOM_MAX = 2;
const CANVAS_ZOOM_STEP = 0.1;

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
    tableColor: DEFAULT_TABLE_COLOR,
    chairColor: DEFAULT_CHAIR_COLOR,
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

function rotatePoint(x: number, y: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

function getCircleChairPosition(table: TableItem, chair: Chair) {
  const rad = (chair.angle * Math.PI) / 180;
  const radiusX = table.width / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  const radiusY = table.height / 2 + CHAIR_GAP + CHAIR_SIZE / 2;

  return {
    x: table.width / 2 + Math.cos(rad) * radiusX - CHAIR_SIZE / 2,
    y: table.height / 2 + Math.sin(rad) * radiusY - CHAIR_SIZE / 2,
  };
}

function getRectChairPosition(table: TableItem, chair: Chair) {
  const rad = (chair.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  const halfW = table.width / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  const halfH = table.height / 2 + CHAIR_GAP + CHAIR_SIZE / 2;

  const scaleX = Math.abs(dx) > 0.0001 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 0.0001 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: table.width / 2 + dx * scale - CHAIR_SIZE / 2,
    y: table.height / 2 + dy * scale - CHAIR_SIZE / 2,
  };
}

function getSemicircleChairPosition(table: TableItem, chair: Chair) {
  // 半円テーブルは、下側の弧に沿って椅子を動かす想定。
  const angle = clamp(normalizeAngle(chair.angle), 180, 360);
  const rad = (angle * Math.PI) / 180;
  const radiusX = table.width / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
  const radiusY = table.height + CHAIR_GAP + CHAIR_SIZE / 2;

  return {
    x: table.width / 2 + Math.cos(rad) * radiusX - CHAIR_SIZE / 2,
    y: table.height + Math.sin(rad) * radiusY - CHAIR_SIZE / 2,
  };
}

function getTriangleChairPosition(table: TableItem, chair: Chair) {
  // 三角形の外接矩形レールに近い操作感にする。視覚的には三角の周辺をスライドする。
  return getRectChairPosition(table, chair);
}

function getChairPosition(table: TableItem, chair: Chair) {
  if (table.shape === "rect") return getRectChairPosition(table, chair);
  if (table.shape === "semicircle") return getSemicircleChairPosition(table, chair);
  if (table.shape === "triangle") return getTriangleChairPosition(table, chair);
  return getCircleChairPosition(table, chair);
}

function getHandleCounterRotation(rotation: number) {
  return `rotate(${-rotation}deg)`;
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
    border: `2px solid ${activeBorderColor}`,
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
    return (
      <div
        className="absolute inset-x-0 bottom-0 h-full rounded-t-full shadow-sm"
        style={commonStyle}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 shadow-sm ${table.shape === "rect" ? "rounded-2xl" : "rounded-full"}`}
      style={commonStyle}
    />
  );
}

export default function SeatLayoutEditor() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [objects, setObjects] = useState<LayoutObject[]>([]);
  const [selectedShape, setSelectedShape] = useState<TableShape>("circle");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [mockSavedLayoutName, setMockSavedLayoutName] = useState<string | null>(null);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId]
  );

  function selectTable(tableId: string) {
    setSelectedTableId(tableId);
    setSelectedObjectId(null);
  }

  function selectObject(objectId: string) {
    setSelectedObjectId(objectId);
    setSelectedTableId(null);
  }

  function addTableAtCenter(shape: TableShape) {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const x = rect ? rect.width / 2 / canvasZoom - DEFAULT_TABLE_SIZE / 2 : 120;
    const y = rect ? rect.height / 2 / canvasZoom - DEFAULT_TABLE_SIZE / 2 : 120;
    const table = createTable(shape, x, y);

    setTables((prev) => [...prev, table]);
    selectTable(table.id);
  }

  function addObjectAtCenter() {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const x = rect ? rect.width / 2 / canvasZoom - DEFAULT_OBJECT_WIDTH / 2 : 160;
    const y = rect ? rect.height / 2 / canvasZoom - DEFAULT_OBJECT_HEIGHT / 2 : 160;
    const object = createLayoutObject(x, y);

    setObjects((prev) => [...prev, object]);
    selectObject(object.id);
  }

  function addItemByDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const itemType = event.dataTransfer.getData("item-type");
    const shape = event.dataTransfer.getData("table-shape") as TableShape;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvasZoom;
    const y = (event.clientY - rect.top) / canvasZoom;

    if (itemType === "table" && TABLE_OPTIONS.some((option) => option.shape === shape)) {
      const table = createTable(shape, Math.max(0, x - DEFAULT_TABLE_SIZE / 2), Math.max(0, y - DEFAULT_TABLE_SIZE / 2));
      setTables((prev) => [...prev, table]);
      selectTable(table.id);
      return;
    }

    if (itemType === "object") {
      const object = createLayoutObject(Math.max(0, x - DEFAULT_OBJECT_WIDTH / 2), Math.max(0, y - DEFAULT_OBJECT_HEIGHT / 2));
      setObjects((prev) => [...prev, object]);
      selectObject(object.id);
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

  function changeSelectedTableColor(key: "tableColor" | "chairColor", rawColor: string) {
    if (!selectedTableId) return;
    const color = normalizeHexInput(rawColor);
    updateTable(selectedTableId, (table) => ({ ...table, [key]: color }));
  }

  function commitSelectedTableColor(key: "tableColor" | "chairColor", rawColor: string) {
    if (!selectedTableId) return;
    const color = normalizeHexInput(rawColor);
    if (!isValidHexColor(color)) return;
    updateTable(selectedTableId, (table) => ({ ...table, [key]: color }));
  }

  function changeSelectedObjectColor(rawColor: string) {
    if (!selectedObjectId) return;
    const color = normalizeHexInput(rawColor);
    updateObject(selectedObjectId, (object) => ({ ...object, color }));
  }

  function commitSelectedObjectColor(rawColor: string) {
    if (!selectedObjectId) return;
    const color = normalizeHexInput(rawColor);
    if (!isValidHexColor(color)) return;
    updateObject(selectedObjectId, (object) => ({ ...object, color }));
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragMode) return;

    const point = getPointerPoint(event);

    if (dragMode.type === "move-table") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      updateTable(dragMode.tableId, (table) => ({
        ...table,
        x: dragMode.originX + dx,
        y: dragMode.originY + dy,
      }));
    }

    if (dragMode.type === "resize-table") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      updateTable(dragMode.tableId, (table) => ({
        ...table,
        width: Math.max(MIN_TABLE_SIZE, dragMode.originW + dx),
        height: Math.max(MIN_TABLE_SIZE, dragMode.originH + dy),
      }));
    }

    if (dragMode.type === "rotate-table") {
      const currentAngle = getAngleDeg(dragMode.centerX, dragMode.centerY, point.x, point.y);
      updateTable(dragMode.tableId, (table) => ({
        ...table,
        rotation: dragMode.startRotation + currentAngle - dragMode.startAngle,
      }));
    }

    if (dragMode.type === "slide-chair") {
      const canvas = canvasRef.current;
      const table = tables.find((item) => item.id === dragMode.tableId);
      if (!canvas || !table) return;

      const canvasRect = canvas.getBoundingClientRect();
      const tableCenterX = canvasRect.left + (table.x + table.width / 2) * canvasZoom;
      const tableCenterY = canvasRect.top + (table.y + table.height / 2) * canvasZoom;
      const unrotatedPoint = rotatePoint(point.x - tableCenterX, point.y - tableCenterY, -table.rotation);
      const rawAngle = getAngleDeg(0, 0, unrotatedPoint.x, unrotatedPoint.y);
      const nextAngle = table.shape === "semicircle" ? clamp(normalizeAngle(rawAngle), 180, 360) : rawAngle;

      updateTable(dragMode.tableId, (current) => ({
        ...current,
        chairs: current.chairs.map((chair) =>
          chair.id === dragMode.chairId ? { ...chair, angle: nextAngle } : chair
        ),
      }));
    }

    if (dragMode.type === "move-object") {
      const dx = (point.x - dragMode.startX) / canvasZoom;
      const dy = (point.y - dragMode.startY) / canvasZoom;
      updateObject(dragMode.objectId, (object) => ({
        ...object,
        x: dragMode.originX + dx,
        y: dragMode.originY + dy,
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

  function removeSelectedTable() {
    if (!selectedTableId) return;
    setTables((prev) => prev.filter((table) => table.id !== selectedTableId));
    setSelectedTableId(null);
  }

  function removeSelectedObject() {
    if (!selectedObjectId) return;
    setObjects((prev) => prev.filter((object) => object.id !== selectedObjectId));
    setSelectedObjectId(null);
  }

  function uploadBackgroundImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setBackgroundImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return imageUrl;
    });
  }

  function removeBackgroundImage() {
    setBackgroundImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function changeZoom(delta: number) {
    setCanvasZoom((current) => Number(clamp(current + delta, CANVAS_ZOOM_MIN, CANVAS_ZOOM_MAX).toFixed(2)));
  }

  function mockSaveLayout() {
    const name = layoutName.trim();
    if (!name) return;
    setMockSavedLayoutName(name);
    setIsSaveModalOpen(false);
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 p-5 text-slate-900">
      <h1 className="text-2xl font-bold">座席レイアウト</h1>

      <div className="mt-4 flex h-[calc(100vh-76px)] gap-5">
        <main className="flex h-full min-w-0 flex-1 flex-col">

          <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold">キャンバス</p>
              <p className="text-xs text-slate-500">画面の高さに合わせて広く表示します。</p>
              {mockSavedLayoutName && (
                <p className="mt-1 text-xs font-medium text-blue-700">
                  「{mockSavedLayoutName}」として保存しました（モック）。
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
            className="relative min-h-0 flex-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className="absolute left-0 top-0 z-10 origin-top-left"
              style={{
                width: `${100 / canvasZoom}%`,
                height: `${100 / canvasZoom}%`,
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
                const isSelected = selectedObjectId === object.id;
                const isOperating =
                  (dragMode?.type === "move-object" && dragMode.objectId === object.id) ||
                  (dragMode?.type === "resize-object" && dragMode.objectId === object.id) ||
                  (dragMode?.type === "rotate-object" && dragMode.objectId === object.id);
                const activeBorderColor = isSelected || isOperating ? ACTIVE_BORDER : IDLE_BORDER;
                const counterRotation = getHandleCounterRotation(object.rotation);

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
                    onPointerDown={() => selectObject(object.id)}
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
                        style={{ transform: counterRotation }}
                      >
                        {object.name || "オブジェクト"}
                      </div>

                      <button
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          selectObject(object.id);
                          setDragMode({
                            type: "move-object",
                            objectId: object.id,
                            startX: point.x,
                            startY: point.y,
                            originX: object.x,
                            originY: object.y,
                          });
                        }}
                        className="absolute -bottom-14 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                        style={{ transform: `translateX(-50%) ${counterRotation}` }}
                        aria-label="オブジェクトを移動"
                        title="移動"
                      >
                        ✣
                      </button>

                      <button
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          const canvas = canvasRef.current;
                          if (!canvas) return;
                          const rect = canvas.getBoundingClientRect();
                          const centerX = rect.left + (object.x + object.width / 2) * canvasZoom;
                          const centerY = rect.top + (object.y + object.height / 2) * canvasZoom;
                          selectObject(object.id);
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

                      <span
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          selectObject(object.id);
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
                const isSelected = selectedTableId === table.id;
                const isOperating =
                  (dragMode?.type === "move-table" && dragMode.tableId === table.id) ||
                  (dragMode?.type === "resize-table" && dragMode.tableId === table.id) ||
                  (dragMode?.type === "rotate-table" && dragMode.tableId === table.id) ||
                  (dragMode?.type === "slide-chair" && dragMode.tableId === table.id);
                const activeBorderColor = isSelected || isOperating ? ACTIVE_BORDER : IDLE_BORDER;
                const counterRotation = getHandleCounterRotation(table.rotation);

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
                    onPointerDown={() => selectTable(table.id)}
                  >
                    {table.chairs.map((chair) => {
                      const chairPos = getChairPosition(table, chair);
                      const isChairOperating =
                        dragMode?.type === "slide-chair" &&
                        dragMode.tableId === table.id &&
                        dragMode.chairId === chair.id;

                      return (
                        <button
                          key={chair.id}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            selectTable(table.id);
                            setDragMode({ type: "slide-chair", tableId: table.id, chairId: chair.id });
                          }}
                          className="absolute z-10 cursor-grab rounded-full text-xs font-bold active:cursor-grabbing"
                          style={{
                            left: chairPos.x,
                            top: chairPos.y,
                            width: CHAIR_SIZE,
                            height: CHAIR_SIZE,
                            backgroundColor: isValidHexColor(table.chairColor) ? table.chairColor : DEFAULT_CHAIR_COLOR,
                            border: `2px solid ${isChairOperating ? ACTIVE_BORDER : IDLE_BORDER}`,
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

                      <div
                        className="relative z-10 flex items-center overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm"
                        style={{ transform: counterRotation }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <button
                          onClick={() => changeChairCount(table.id, 1)}
                          className="px-3 py-1 text-lg font-bold hover:bg-slate-100"
                          aria-label="椅子を増やす"
                        >
                          ＋
                        </button>
                        <span className="min-w-8 border-x border-slate-200 px-2 text-center text-sm font-bold">
                          {table.chairs.length}
                        </span>
                        <button
                          onClick={() => changeChairCount(table.id, -1)}
                          className="px-3 py-1 text-lg font-bold hover:bg-slate-100"
                          aria-label="椅子を減らす"
                        >
                          －
                        </button>
                      </div>

                      <button
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          selectTable(table.id);
                          setDragMode({
                            type: "move-table",
                            tableId: table.id,
                            startX: point.x,
                            startY: point.y,
                            originX: table.x,
                            originY: table.y,
                          });
                        }}
                        className="absolute -bottom-14 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-slate-300 bg-white text-xl shadow-sm active:cursor-grabbing"
                        style={{ transform: `translateX(-50%) ${counterRotation}` }}
                        aria-label="テーブルを移動"
                        title="移動"
                      >
                        ✣
                      </button>

                      <button
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          const canvas = canvasRef.current;
                          if (!canvas) return;
                          const rect = canvas.getBoundingClientRect();
                          const centerX = rect.left + (table.x + table.width / 2) * canvasZoom;
                          const centerY = rect.top + (table.y + table.height / 2) * canvasZoom;
                          selectTable(table.id);
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
                        style={{ transform: counterRotation }}
                        aria-label="テーブルを回転"
                        title="回転"
                      >
                        ↻
                      </button>

                      <span
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          const point = getPointerPoint(event);
                          selectTable(table.id);
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
        </main>

        <div className="flex h-full w-72 shrink-0 flex-col gap-3">
          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            レイアウトを保存
          </button>
          {mockSavedLayoutName && (
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 shadow-sm">
              「{mockSavedLayoutName}」として保存しました（モック）。
            </p>
          )}

          <aside className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">


          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold">テーブル</p>
            {TABLE_OPTIONS.map((option) => (
              <button
                key={option.shape}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("item-type", "table");
                  event.dataTransfer.setData("table-shape", option.shape);
                }}
                onClick={() => setSelectedShape(option.shape)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selectedShape === option.shape ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <TableShapePreview shape={option.shape} />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="text-xs text-slate-500">{option.hint} / ドラッグして配置</span>
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => addTableAtCenter(selectedShape)}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
          >
            選択中のテーブルを追加
          </button>

          <div className="mt-6 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">オブジェクト</p>
            <p className="mt-1 text-xs text-slate-500">ステージ、ピアノ、受付など、座席以外の要素です。</p>
            <button
              draggable
              onDragStart={(event) => event.dataTransfer.setData("item-type", "object")}
              onClick={addObjectAtCenter}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-slate-400 bg-slate-100 text-xs font-bold">
                OBJ
              </span>
              <span>
                <span className="block font-semibold">オブジェクト追加</span>
                <span className="text-xs text-slate-500">名前を付けて管理</span>
              </span>
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">背景画像</p>
            <p className="mt-1 text-xs text-slate-500">未アップロード時は現在のグリッド背景です。</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={uploadBackgroundImage}
              className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            {backgroundImage && (
              <button
                onClick={removeBackgroundImage}
                className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                背景画像を削除
              </button>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">操作</p>
            <p className="mt-2">右下の枠線上ハンドル：サイズ変更</p>
            <p>十字ボタン：移動</p>
            <p>回転ボタン：回転</p>
            <p>椅子：外周に沿ってスライド</p>
          </div>

          {selectedTable && (
            <div className="mt-5 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">選択中のテーブル</p>
              <p className="mt-1 text-xs text-slate-500">
                {Math.round(selectedTable.width)} × {Math.round(selectedTable.height)} / {Math.round(selectedTable.rotation)}°
              </p>

              <div className="mt-4 space-y-4">
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
              </div>

              <button
                onClick={removeSelectedTable}
                className="mt-4 w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                テーブルを削除
              </button>
            </div>
          )}

          {selectedObject && (
            <div className="mt-5 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">選択中のオブジェクト</p>
              <p className="mt-1 text-xs text-slate-500">
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

              <button
                onClick={removeSelectedObject}
                className="mt-4 w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                オブジェクトを削除
              </button>
            </div>
          )}
          </aside>
        </div>
      </div>

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">レイアウトを保存</h2>
                <p className="mt-1 text-sm text-slate-500">保存機能は未接続のため、ここでは名前入力のみ確認します。</p>
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
                  if (event.key === "Enter") mockSaveLayout();
                }}
                placeholder="例：披露宴 A会場 / 2026 春イベント"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={mockSaveLayout}
                disabled={!layoutName.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
