/**
 * /api/results-pictures - シャッフル結果 PNG 保存 API
 * --------------------------------------------------------------------
 * POST: multipart/form-data の "file" フィールドを受け取り、
 *       public/data/results-pictures/result-{ISO}.png に保存して
 *       公開 URL ("/data/results-pictures/xxx.png") を返す。
 *
 * Server Action ではなく API ルートにしている理由:
 *   - Server Action はデフォルト body size 制限が 1MB しかなく、
 *     2x スケール / 1600x1000 viewBox の PNG (5〜10MB) が透過時に
 *     "An unexpected response was received from the server" で失敗する
 *   - API ルートなら 20MB 程度まで受け取れる
 */

import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";

const RESULTS_DIR = path.join(
  process.cwd(),
  "public",
  "data",
  "results-pictures",
);

export const runtime = "nodejs";

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
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます (30MB まで)" },
        { status: 400 },
      );
    }

    await mkdir(RESULTS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `result-${stamp}.png`;
    const fullPath = path.join(RESULTS_DIR, filename);
    await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

    revalidatePath("/results");

    return NextResponse.json({ path: `/data/results-pictures/${filename}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "サーバーエラー" },
      { status: 500 },
    );
  }
}
