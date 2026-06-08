/**
 * /api/members/template - メンバー一括登録テンプレート XLSX のダウンロード
 * --------------------------------------------------------------------
 * GET: 列 = [姓, 名, 年齢, 性別] のヘッダ + ガイド行を含む xlsx を返す。
 *      ユーザーはこれを Excel で開いて編集 → 同じ xlsx として保存し、
 *      /api/members/import にアップロードする想定。
 */

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  // 1 行目: ヘッダ
  // 2-3 行目: サンプル (年齢/性別が空でも OK な例 + 性別未入力なら "その他" 扱いになる旨)
  const ws = XLSX.utils.aoa_to_sheet([
    ["姓", "名", "年齢", "性別"],
    ["佐藤", "太郎", 30, "男性"],
    ["田中", "花子", 25, "女性"],
    ["山田", "翔", "", ""], // 年齢/性別 空欄でも OK
  ]);
  // 列幅を見やすく
  ws["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "メンバー");

  const buffer: Buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="chafflamingo-members-template.xlsx"',
    },
  });
}
