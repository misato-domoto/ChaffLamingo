/**
 * テーブル可視化コンポーネント
 * --------------------------------------------------------------------
 * - キャンバス自身のサイズは固定 (max-w-[460px] / aspect 5:4)。
 *   テーブル数が増えても外側の枠は変わらず、内部のテーブルが縮小して
 *   収まる作りにしている。
 * - 各テーブルは SVG で描画。preserveAspectRatio="xMidYMid meet" を
 *   使うことで、グリッドセルの形状に関わらず円(=丸テーブル)を保ったまま
 *   セル内に最大化される。
 * - 席数 = perTable で固定。シャッフル前の空席状態でもレイアウトが
 *   描画されるので、人数/卓数を選ぶだけでイメージが掴める。
 *
 * グリッドの列数:
 *   1卓:           1列
 *   2-3卓:         その数だけ横一列
 *   4卓:           2x2
 *   5-6卓:         3列x2行
 *   7-9卓:         3x3
 *   10卓以上:      4列で行が増える
 */

import type { Member } from "./types";

type Props = {
  /** 表示するテーブル一覧 (各テーブルに割当てられたメンバー)。 */
  tables: Member[][];
  /** 1卓あたりの席数。これだけの数の席が円周上に並ぶ。 */
  perTable: number;
};

// SVG userspace の座標 (viewBox 0..100)
const TABLE_R = 18; // テーブル本体の半径
const SEAT_R = 9; // 席の半径
const SEAT_RADIUS = 36; // テーブル中心 → 席中心 の距離

export function TableCanvas({ tables, perTable }: Props) {
  const count = tables.length;
  if (count === 0 || perTable === 0) {
    return <EmptyHint />;
  }

  const cols = computeCols(count);
  const rows = Math.ceil(count / cols);

  return (
    <div
      className="mx-auto w-full max-w-[460px]"
      style={{ aspectRatio: "5 / 4" }}
    >
      <div
        className="grid h-full w-full gap-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {tables.map((members, i) => (
          <SingleTable
            key={i}
            members={members}
            perTable={perTable}
            index={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

function computeCols(n: number): number {
  if (n <= 1) return 1;
  if (n <= 3) return n; // 横一列
  if (n === 4) return 2; // 2x2
  if (n <= 9) return 3; // 5,6 → 2行 / 7,8,9 → 3行
  return 4; // 10卓以上は4列
}

/**
 * 1テーブル分の SVG 描画。
 * - viewBox は 0..100 の正方形。
 * - preserveAspectRatio="xMidYMid meet" により、親セルがどんな縦横比でも
 *   中央に正方形として収まる (= 円テーブルが楕円にならない)。
 */
function SingleTable({
  members,
  perTable,
  index,
}: {
  members: Member[];
  perTable: number;
  index: number;
}) {
  // perTable 個の席を、テーブルの周囲に均等配置で並べる。
  // 角度: 上 (-π/2) を起点に時計回り。
  const seats = Array.from({ length: perTable }, (_, i) => {
    const angle = (i / perTable) * Math.PI * 2 - Math.PI / 2;
    return {
      x: 50 + SEAT_RADIUS * Math.cos(angle),
      y: 50 + SEAT_RADIUS * Math.sin(angle),
      // members[i] が居れば座らせる。足りなければ空席。
      member: members[i] ?? null,
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={`テーブル ${index}: ${members.length} / ${perTable} 人`}
    >
      {/* テーブル番号 (右上に薄く) */}
      <text
        x="98"
        y="9"
        textAnchor="end"
        fontSize="7"
        fontWeight="700"
        fill="var(--flamingo)"
        fillOpacity="0.7"
      >
        T{index}
      </text>

      {/* テーブル本体 (丸) */}
      <circle
        cx="50"
        cy="50"
        r={TABLE_R}
        fill="var(--flamingo-tint)"
        stroke="var(--flamingo-soft)"
        strokeWidth="1.5"
      />

      {/* 席 (perTable 個。空席もここで描画) */}
      {seats.map((seat, i) => (
        <Seat key={i} {...seat} />
      ))}
    </svg>
  );
}

/**
 * 1席の描画。
 * - filled (member あり): 白塗り + 名前
 * - empty                : 同色の薄い円のみ (シャッフル前 or 余席)
 */
function Seat({
  x,
  y,
  member,
}: {
  x: number;
  y: number;
  member: Member | null;
}) {
  const filled = member !== null;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r={SEAT_R}
        fill={filled ? "white" : "var(--flamingo-tint)"}
        stroke="var(--flamingo-soft)"
        strokeWidth="1.4"
      />
      {filled && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="5.5"
          fontWeight="700"
          fill="var(--flamingo-deep)"
        >
          {member.name.slice(0, 2)}
        </text>
      )}
    </g>
  );
}

function EmptyHint() {
  return (
    <div className="grid min-h-[280px] place-items-center text-sm text-[var(--muted-foreground)]">
      <p className="text-center">テーブル数と人数を選択してください</p>
    </div>
  );
}
