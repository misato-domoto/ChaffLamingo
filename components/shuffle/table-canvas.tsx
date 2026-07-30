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
 * - 椅子の描画:
 *     - pictureUrl があれば、その画像で椅子を差し替え (clipPath で円に整形)
 *     - 無ければ白丸 (空席は flamingo-tint 色)
 * - メンバー名は椅子の "外側" に表示する (席のテーブル中心からの方向に沿う)。
 */

import type { Member } from "@/lib/types";

type Props = {
  /** 表示するテーブル一覧 (各テーブルに割当てられたメンバー)。 */
  tables: Member[][];
  /** 1卓あたりの席数。これだけの数の席が円周上に並ぶ。 */
  perTable: number;
};

// SVG userspace の座標 (viewBox 0..100)
const TABLE_R = 16; // テーブル本体の半径
const SEAT_R = 8; // 席の半径
const SEAT_RADIUS = 34; // テーブル中心 → 席中心 の距離
// 名前ラベルを席の外側にどれだけ離すか (SEAT_R + 余白)
const NAME_DISTANCE = SEAT_R + 4;

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
        className="grid h-[calc(100vh-260px)] w-full gap-3"
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
  if (n <= 3) return n;
  if (n === 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

function SingleTable({
  members,
  perTable,
  index,
}: {
  members: Member[];
  perTable: number;
  index: number;
}) {
  // perTable 個の席を、テーブルの周囲に均等配置。
  // angle: 上 (-π/2) を起点に時計回り。
  const seats = Array.from({ length: perTable }, (_, i) => {
    const angle = (i / perTable) * Math.PI * 2 - Math.PI / 2;
    return {
      angle,
      x: 50 + SEAT_RADIUS * Math.cos(angle),
      y: 50 + SEAT_RADIUS * Math.sin(angle),
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
      {/* 写真を椅子内に切り抜くための clipPath を一括定義 */}
      <defs>
        {seats.map((seat, i) =>
          seat.member?.pictureUrl ? (
            <clipPath key={i} id={`clip-${index}-${seat.member.id}`}>
              <circle cx={seat.x} cy={seat.y} r={SEAT_R} />
            </clipPath>
          ) : null,
        )}
      </defs>

      {/* テーブル番号 */}
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
        strokeWidth="1.2"
      />

      {/* 席 */}
      {seats.map((seat, i) => (
        <Seat key={i} {...seat} tableIndex={index} />
      ))}
    </svg>
  );
}

/**
 * 1席の描画 (椅子 + 外側名前)。
 * - filled (member あり, 写真なし): 白塗りの円 + 外側に名前
 * - filled (member あり, 写真あり): 写真を円形にクリップ + 外側に名前
 * - empty                          : 薄いピンクの円のみ (シャッフル前 or 余席)
 */
function Seat({
  x,
  y,
  angle,
  member,
  tableIndex,
}: {
  x: number;
  y: number;
  angle: number;
  member: Member | null;
  tableIndex: number;
}) {
  const filled = member !== null;
  const hasPhoto = !!member?.pictureUrl;

  // 名前の位置: 席中心から外向き方向に NAME_DISTANCE 進めた点
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const nameX = x + cosA * NAME_DISTANCE;
  const nameY = y + sinA * NAME_DISTANCE;

  // テキストのアンカー: 方向に応じて切り替え (見た目を「席の外側」に揃える)
  const textAnchor =
    cosA > 0.3 ? "start" : cosA < -0.3 ? "end" : "middle";
  const dominantBaseline =
    sinA > 0.3 ? "hanging" : sinA < -0.3 ? "alphabetic" : "central";

  return (
    <g>
      {/* 椅子本体 */}
      {hasPhoto ? (
        <>
          <image
            href={member!.pictureUrl}
            x={x - SEAT_R}
            y={y - SEAT_R}
            width={SEAT_R * 2}
            height={SEAT_R * 2}
            clipPath={`url(#clip-${tableIndex}-${member!.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
          {/* 写真の縁取り */}
          <circle
            cx={x}
            cy={y}
            r={SEAT_R}
            fill="none"
            stroke="var(--flamingo-soft)"
            strokeWidth="1.2"
          />
        </>
      ) : (
        <circle
          cx={x}
          cy={y}
          r={SEAT_R}
          fill={filled ? "white" : "var(--flamingo-tint)"}
          stroke="var(--flamingo-soft)"
          strokeWidth="1.2"
        />
      )}

      {/* 外側の名前ラベル */}
      {filled && (
        <text
          x={nameX}
          y={nameY}
          textAnchor={textAnchor}
          dominantBaseline={dominantBaseline}
          fontSize="4.5"
          fontWeight="600"
          fill="var(--flamingo-deep)"
        >
          {member!.name}
        </text>
      )}
    </g>
  );
}

function EmptyHint() {
  return (
    <div className="grid min-h-[280px] place-items-center text-sm text-muted-foreground">
      <p className="text-center">テーブル数と人数を選択してください</p>
    </div>
  );
}
