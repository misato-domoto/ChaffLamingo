/**
 * アプリ全体で共有するドメイン型。
 *
 * - 画面間で受け渡しされる「メンバー」「タグ」など、複数のフォルダから
 *   参照される型はここに集約する。
 * - 画面ローカルでしか使わない型は components/<画面名>/types.ts に置く。
 *   (例: components/shuffle/types.ts)
 */

/** 性別。null/空 を許容するため optional 扱い。 */
export type Gender = "male" | "female" | "other";

export const GENDER_LABELS: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

/**
 * メンバー (1人) を表す。
 * - id: UUID。Server Actions 側で発番する
 * - lastName / firstName: 姓と名を分けて持つ (シャッフル時の "苗字" 表示のため)
 * - name: 旧データ互換用のフルネーム。新規データでは未保存でも OK。
 *   表示時は getDisplayName() を使うこと。
 * - pictureUrl: 画像が登録されてれば "/data/members-pictures/{id}.{ext}" のような URL
 * - tagIds: そのメンバーに付いているタグの id 配列 (タグは Tag を参照)
 */
export type Member = {
  id: string;
  /** 姓 */
  lastName: string;
  /** 名 */
  firstName: string;
  /**
   * 旧データ互換用フルネーム。
   * 新規データは getDisplayName(m) で生成するので保持しなくても OK。
   * 既存 JSON で name しか持たないレコードを読む場合のフォールバックに使う。
   */
  name?: string;
  birthDate?: string; // "YYYY-MM-DD" 形式 (input[type=date] の value 形式)
  /**
   * 年齢 (歳)。Excel 一括取り込み時に「年齢」列から入る。
   * birthDate (生年月日) は手動登録時用。両方持つこともあり得る。
   */
  age?: number;
  gender?: Gender;
  pictureUrl?: string;
  tagIds: string[];
};

/**
 * 表示用フルネームを作る (例: "佐藤 一郎")。
 * lastName/firstName が両方無い古いデータは name から復元する。
 */
export function getDisplayName(m: Member): string {
  const last = m.lastName?.trim() ?? "";
  const first = m.firstName?.trim() ?? "";
  const joined = [last, first].filter(Boolean).join(" ");
  return joined || (m.name ?? "").trim();
}

/**
 * シャッフルで「椅子に苗字を表示」する時の表示文字列を返す。
 * lastName があればそれ、無ければ name の先頭 2-3 文字。
 */
export function getSurnameForDisplay(m: Member): string {
  if (m.lastName?.trim()) return m.lastName.trim();
  if (m.name) {
    const parts = m.name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return parts[0];
    return m.name.slice(0, 3);
  }
  return "";
}

/**
 * 旧データ ({ name }) を新型 ({ lastName, firstName }) に正規化。
 * - name に空白があれば「先頭=姓 / 残り=名」として分割
 * - 既に lastName/firstName があればそれを尊重
 */
export function normalizeMember(raw: Partial<Member> & { id: string }): Member {
  const tagIds = raw.tagIds ?? [];
  // 新しい構造を持っているならそのまま
  if (raw.lastName !== undefined || raw.firstName !== undefined) {
    return {
      id: raw.id,
      lastName: raw.lastName ?? "",
      firstName: raw.firstName ?? "",
      name: raw.name,
      birthDate: raw.birthDate,
      age: raw.age,
      gender: raw.gender,
      pictureUrl: raw.pictureUrl,
      tagIds,
    };
  }
  // 旧データ: name を分割
  const name = (raw.name ?? "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    id: raw.id,
    lastName: parts[0] ?? "",
    firstName: parts.slice(1).join(" "),
    name,
    birthDate: raw.birthDate,
    age: raw.age,
    gender: raw.gender,
    pictureUrl: raw.pictureUrl,
    tagIds,
  };
}

/** タグ (1つ)。シャッフルや絞り込みのカテゴリ。 */
export type Tag = {
  id: string;
  name: string;
};

// ─────────────────────────────────────────────────────────────────────
// 座席レイアウト / シャッフル結果まわりの型
// ─────────────────────────────────────────────────────────────────────

export type TableShape =
  | "circle"
  | "rect"
  | "semicircle"
  | "triangle"
  | "ellipse";

export type LayoutObjectShape = "rect" | "circle";

export type LayoutChair = {
  id: string;
  /** 椅子の角度 (テーブル中心からの方向)。座席レイアウトエディタが管理。 */
  angle: number;
};

export type LayoutTable = {
  id: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  tableColor: string;
  chairColor: string;
  chairs: LayoutChair[];
  /** テーブルにつけた名前 (例: "テーブル A")。未指定/空文字なら非表示 */
  name?: string;
  /** テーブル枠線色 (未指定なら slate ベースの既定色) */
  tableBorderColor?: string;
  /** 椅子枠線色 (未指定なら slate ベースの既定色) */
  chairBorderColor?: string;
  /**
   * ラベル (テーブル名 / シャッフル時のメンバー名) のテキスト色。
   * SeatLayoutEditor の labelColor と対応。未指定なら既定色。
   */
  labelColor?: string;
  /**
   * テーブルごとの椅子サイズ倍率 (= ベースサイズに対する倍率)。
   * SeatLayoutEditor の chairSizeScale と対応。未指定 (古いデータ) は 1。
   */
  chairSizeScale?: number;
  /**
   * テーブル外周から椅子スライドレールまでの距離 (px)。
   * SeatLayoutEditor の chairRailGap と対応。未指定 (古いデータ) は 18。
   */
  chairRailGap?: number;
};

export type LayoutObject = {
  id: string;
  name: string;
  shape: LayoutObjectShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
};

/**
 * 保存済みレイアウト 1件。
 * - 保存先: public/data/layouts/{name}.json
 * - name はファイル名にも使うので一意。
 * - 椅子にメンバーは紐付けない (メンバーはシャッフル時に動的に割り当てる)。
 */
export type Layout = {
  name: string;
  isFavorite: boolean;
  tables: LayoutTable[];
  objects: LayoutObject[];
  /**
   * 背景画像の公開 URL (例: "/data/layouts-bg/abc-123.png")。
   * 未設定なら グリッド背景にフォールバック。
   * 画像実体は API POST /api/layouts-bg で public/data/layouts-bg/ に保存される。
   * フィールド名は SeatLayoutEditor 側と合わせて backgroundImagePath で統一。
   */
  backgroundImagePath?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** シャッフル結果として保存される PNG 1件のメタ情報。 */
export type ResultImage = {
  filename: string;
  /** ブラウザからアクセスできる URL (例: "/data/results-pictures/xxx.png") */
  path: string;
  /** 保存日時 (ファイルの mtime から ISO 文字列で取得)。 */
  createdAt: string;
};
