/**
 * /api/layouts-bg - レイアウト背景画像のアップロード API
 * --------------------------------------------------------------------
 * POST: multipart/form-data の "file" フィールドを受け取り、
 *       public/data/layouts-bg/{uuid}.{ext} に保存して
 *       公開 URL (例 "/data/layouts-bg/xxx.png") を返す。
 *
 * SeatLayoutEditor から fetch("/api/layouts-bg", { method: "POST", body: formData })
 * で呼ばれる想定。Server Action 経由ではなく API ルートにしているのは、
 * 大きいバイナリを Form 経由でやり取りするのが安定するため。
 */

import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const LAYOUTS_BG_DIR = path.join(
  process.cwd(),
  "public",
  "data",
  "layouts-bg",
);

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

    // 念のため簡易バリデーション (画像系のみ受け入れ)
    if (file.size === 0) {
      return NextResponse.json(
        { error: "空ファイルです" },
        { status: 400 },
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます (20MB まで)" },
        { status: 400 },
      );
    }

    await mkdir(LAYOUTS_BG_DIR, { recursive: true });
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `${randomUUID()}.${ext}`;
    const fullPath = path.join(LAYOUTS_BG_DIR, filename);

    await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ path: `/data/layouts-bg/${filename}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "サーバーエラー" },
      { status: 500 },
    );
  }
}
