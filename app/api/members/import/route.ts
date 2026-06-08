/**
 * /api/members/import - メンバー Excel 一括取り込み
 * --------------------------------------------------------------------
 * POST: multipart/form-data の "file" (.xlsx) を受け取り、
 *       1 行目をヘッダとしてパース。各行を検証し、エラーがあれば
 *       400 で詳細を返す。検証 OK なら bulkAddMembers でまとめて保存。
 *
 * 検証ルール:
 *   - 姓 (lastName) 必須 (空文字不可)
 *   - 名 (firstName) 必須
 *   - 年齢 (age) 任意。数値に変換できない値はエラー
 *   - 性別 (gender) 任意。値が "男性"/"女性"/"その他" 以外なら "その他" に丸める
 *
 * いずれかの行に「姓/名 欠落」「年齢が数値でない」がある場合は
 * 全体を失敗扱いにし、エラー一覧を返す (= 部分取り込みしない)。
 */

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { bulkAddMembers } from "@/lib/data";
import type { Gender } from "@/lib/types";

export const runtime = "nodejs";

type Row = {
  rowNumber: number; // 1-origin の Excel 上の行番号 (ヘッダを除いた値が入る最初は 2)
  lastName: string;
  firstName: string;
  age?: number;
  gender: Gender;
};

type RowError = { row: number; message: string };

function toGender(raw: unknown): Gender {
  const s = String(raw ?? "").trim();
  if (s === "男性" || s === "male" || s === "M" || s === "Male") return "male";
  if (s === "女性" || s === "female" || s === "F" || s === "Female") return "female";
  // 仕様: 未入力 / 不明値はすべて "その他"
  return "other";
}

/** ヘッダ行から列インデックスを推定する。ヘッダ表記の揺らぎを多少吸収する。 */
function resolveHeaders(header: unknown[]): {
  last: number;
  first: number;
  age: number;
  gender: number;
} {
  const map = { last: -1, first: -1, age: -1, gender: -1 };
  header.forEach((h, i) => {
    const s = String(h ?? "").trim();
    if (/^(姓|苗字|lastName|last_name|sei)$/i.test(s)) map.last = i;
    else if (/^(名|名前|firstName|first_name|mei)$/i.test(s)) map.first = i;
    else if (/^(年齢|age|toshi)$/i.test(s)) map.age = i;
    else if (/^(性別|gender|sex)$/i.test(s)) map.gender = i;
  });
  return map;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "空ファイルです" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます (10MB まで)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "シートが見つかりません" },
        { status: 400 },
      );
    }
    const sheet = workbook.Sheets[sheetName];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    if (raw.length === 0) {
      return NextResponse.json(
        { error: "シートが空です" },
        { status: 400 },
      );
    }

    const headers = resolveHeaders(raw[0]);
    if (headers.last < 0 || headers.first < 0) {
      return NextResponse.json(
        {
          error:
            "ヘッダ行に '姓' と '名' の列が必要です (テンプレートをご使用ください)",
        },
        { status: 400 },
      );
    }

    // 2 行目以降を検証
    const rows: Row[] = [];
    const errors: RowError[] = [];
    for (let i = 1; i < raw.length; i++) {
      const cells = raw[i];
      // 全て空の行はスキップ
      const allEmpty = cells.every(
        (c) => c === "" || c === null || c === undefined,
      );
      if (allEmpty) continue;

      const rowNumber = i + 1; // Excel 上の行番号 (1-origin、ヘッダ込み)
      const lastName = String(cells[headers.last] ?? "").trim();
      const firstName = String(cells[headers.first] ?? "").trim();

      if (!lastName || !firstName) {
        errors.push({
          row: rowNumber,
          message: `${!lastName ? "姓" : ""}${!lastName && !firstName ? "・" : ""}${!firstName ? "名" : ""}が未入力です`,
        });
        continue;
      }

      // 年齢: 任意。空ならundefined。数値以外で値があればエラー
      let age: number | undefined = undefined;
      const ageCell = headers.age >= 0 ? cells[headers.age] : "";
      if (ageCell !== "" && ageCell !== null && ageCell !== undefined) {
        const n = Number(ageCell);
        if (!Number.isFinite(n) || n < 0 || n > 150) {
          errors.push({
            row: rowNumber,
            message: `年齢が不正です (0〜150 の数値): ${String(ageCell)}`,
          });
          continue;
        }
        age = Math.floor(n);
      }

      // 性別: 任意。未入力/不明値は "その他"
      const genderCell = headers.gender >= 0 ? cells[headers.gender] : "";
      const gender = toGender(genderCell);

      rows.push({ rowNumber, lastName, firstName, age, gender });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "入力エラーがあります。アップロードは行われませんでした。",
          errors,
        },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "登録対象の行がありません" },
        { status: 400 },
      );
    }

    const { added } = await bulkAddMembers(
      rows.map((r) => ({
        lastName: r.lastName,
        firstName: r.firstName,
        age: r.age,
        gender: r.gender,
      })),
    );

    return NextResponse.json({ added });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "サーバーエラー" },
      { status: 500 },
    );
  }
}
