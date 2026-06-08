"use server";

/**
 * データアクセス層 (Server Actions)
 * --------------------------------------------------------------------
 * - メンバー / タグ の CRUD を JSON ファイルで永続化する。
 * - "use server" ディレクティブにより、このファイルの export 関数は
 *   全て Server Action になる。Client Component からも呼び出せて、
 *   実体はサーバー側で実行される (= Node の fs が使える)。
 * - 将来 DB に乗せ替える場合は、ここのバックエンドだけ差し替えれば
 *   呼び出し側 (UI) は触らずに済む。
 *
 * データの保存先:
 *   public/data/members.json          メンバー一覧
 *   public/data/tags.json             タグ一覧
 *   public/data/members-pictures/     メンバーアイコン画像
 *
 * NOTE: 本番運用時はコンテナ再起動でデータが消えうるので注意。
 *       Docker でデプロイする場合は public/data を Volume にマウントする。
 */

import { mkdir, readFile, writeFile, unlink, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import type { Layout, Member, ResultImage, Tag } from "./types";
import { normalizeMember } from "./types";

// ── 保存パス ───────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "public", "data");
const MEMBERS_JSON = path.join(DATA_DIR, "members.json");
const TAGS_JSON = path.join(DATA_DIR, "tags.json");
const MEMBER_PICTURES_DIR = path.join(DATA_DIR, "members-pictures");
const LAYOUTS_DIR = path.join(DATA_DIR, "layouts");
const LAYOUTS_BG_DIR = path.join(DATA_DIR, "layouts-bg");
const RESULTS_PICTURES_DIR = path.join(DATA_DIR, "results-pictures");

// ── 共通ヘルパ (内部用、export しない) ─────────────────────────────
async function readJsonOrDefault<T>(
  filePath: string,
  defaultValue: T,
): Promise<T> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (e) {
    // ファイルが無いだけなら初期値で続行
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return defaultValue;
    throw e;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  // 親ディレクトリが無ければ作る
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── メンバー ────────────────────────────────────────────────────────

/**
 * メンバー一覧を取得。
 * 既存データが旧構造 ({ name }) でも normalizeMember で姓/名に分割して返す。
 */
export async function getMembers(): Promise<Member[]> {
  const raw = await readJsonOrDefault<Array<Partial<Member> & { id: string }>>(
    MEMBERS_JSON,
    [],
  );
  return raw.map(normalizeMember);
}

/**
 * メンバーを作成 or 更新する。
 * - id を渡せば既存メンバーを更新、無ければ新規作成 (UUID を発番)。
 * - 戻り値は反映後のメンバー (id 確定済み)。
 */
export async function saveMember(
  input: Omit<Member, "id"> & { id?: string },
): Promise<Member> {
  const members = await getMembers();
  const id = input.id ?? randomUUID();
  // フルネームは表示用の便宜フィールドとして同時保存する
  const fullName = `${input.lastName ?? ""} ${input.firstName ?? ""}`
    .trim();
  const next: Member = {
    id,
    lastName: input.lastName ?? "",
    firstName: input.firstName ?? "",
    name: fullName || undefined,
    birthDate: input.birthDate,
    age: input.age,
    gender: input.gender,
    pictureUrl: input.pictureUrl,
    tagIds: input.tagIds ?? [],
  };

  const idx = members.findIndex((m) => m.id === id);
  if (idx >= 0) {
    members[idx] = next;
  } else {
    members.push(next);
  }
  await writeJson(MEMBERS_JSON, members);

  // 関連画面を invalidate (Server Component の再フェッチを促す)
  revalidatePath("/members");
  revalidatePath("/tags");
  revalidatePath("/");

  return next;
}

/**
 * 複数メンバーを一括で追加する (Excel 取り込み用)。
 * - id は新規発番。既存メンバーの上書きはしない (= 同名でも別レコード)。
 * - 戻り値は追加した件数。
 */
export async function bulkAddMembers(
  inputs: Array<
    Omit<Member, "id" | "tagIds"> & { tagIds?: string[] }
  >,
): Promise<{ added: number }> {
  const members = await getMembers();
  const created: Member[] = inputs.map((input) => {
    const id = randomUUID();
    const fullName = `${input.lastName ?? ""} ${input.firstName ?? ""}`
      .trim();
    return {
      id,
      lastName: input.lastName ?? "",
      firstName: input.firstName ?? "",
      name: fullName || undefined,
      birthDate: input.birthDate,
      age: input.age,
      gender: input.gender,
      pictureUrl: input.pictureUrl,
      tagIds: input.tagIds ?? [],
    };
  });
  await writeJson(MEMBERS_JSON, [...members, ...created]);
  revalidatePath("/members");
  revalidatePath("/tags");
  revalidatePath("/");
  return { added: created.length };
}

/** メンバーを削除。アイコン画像も一緒に消す。 */
export async function deleteMember(id: string): Promise<void> {
  const members = await getMembers();
  const target = members.find((m) => m.id === id);
  const remaining = members.filter((m) => m.id !== id);

  // 画像があれば物理削除 (失敗しても無視)
  if (target?.pictureUrl) {
    try {
      const filename = path.basename(target.pictureUrl);
      await unlink(path.join(MEMBER_PICTURES_DIR, filename));
    } catch {
      /* noop */
    }
  }

  await writeJson(MEMBERS_JSON, remaining);
  revalidatePath("/members");
  revalidatePath("/tags");
  revalidatePath("/");
}

/**
 * メンバー画像のアップロード。
 * - FormData 経由でファイルを受け取り、members-pictures/ に保存する。
 * - 保存後の public URL ("/data/members-pictures/xxx.png") を返す。
 * - 同じ memberId なら上書きされる。
 */
export async function uploadMemberPicture(
  memberId: string,
  formData: FormData,
): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("file is required");
  }

  await mkdir(MEMBER_PICTURES_DIR, { recursive: true });

  // 拡張子だけは元のファイルから引き継ぐ (png/jpg/webp 等)
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const filename = `${memberId}.${ext}`;
  const fullPath = path.join(MEMBER_PICTURES_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return `/data/members-pictures/${filename}`;
}

// ── タグ ─────────────────────────────────────────────────────────────

/** タグ一覧を取得。 */
export async function getTags(): Promise<Tag[]> {
  return readJsonOrDefault<Tag[]>(TAGS_JSON, []);
}

/** タグの作成 or 更新 (タグ名のみ)。 */
export async function saveTag(
  input: Omit<Tag, "id"> & { id?: string },
): Promise<Tag> {
  const tags = await getTags();
  const id = input.id ?? randomUUID();
  const next: Tag = { id, name: input.name };

  const idx = tags.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tags[idx] = next;
  } else {
    tags.push(next);
  }
  await writeJson(TAGS_JSON, tags);
  revalidatePath("/tags");
  revalidatePath("/members");
  return next;
}

/**
 * タグを削除。
 * - タグ自体を消すのに加え、各メンバーの tagIds からも除外する
 *   (= 孤立した参照が残らないように整合性を取る)。
 */
export async function deleteTag(id: string): Promise<void> {
  const tags = await getTags();
  const remaining = tags.filter((t) => t.id !== id);
  await writeJson(TAGS_JSON, remaining);

  const members = await getMembers();
  const updated = members.map((m) => ({
    ...m,
    tagIds: m.tagIds.filter((tid) => tid !== id),
  }));
  await writeJson(MEMBERS_JSON, updated);

  revalidatePath("/tags");
  revalidatePath("/members");
}

/**
 * このタグを持つメンバーを差し替える (タグ画面の「適用メンバー編集」用)。
 * - memberIds に含まれるメンバーには付与し、含まれないメンバーからは外す。
 */
export async function setTagMembers(
  tagId: string,
  memberIds: string[],
): Promise<void> {
  const members = await getMembers();
  const updated = members.map((m) => {
    const has = m.tagIds.includes(tagId);
    const should = memberIds.includes(m.id);
    if (has === should) return m;
    if (should) {
      return { ...m, tagIds: [...m.tagIds, tagId] };
    }
    return { ...m, tagIds: m.tagIds.filter((tid) => tid !== tagId) };
  });
  await writeJson(MEMBERS_JSON, updated);
  revalidatePath("/tags");
  revalidatePath("/members");
}

// ── レイアウト ─────────────────────────────────────────────────────

/**
 * ファイル名として安全な layout 名に変換する。
 * - スラッシュやコロン等の禁止文字を除去 (パストラバーサル対策含む)。
 * - 連続スペースを 1 つにまとめる。
 */
function sanitizeLayoutName(name: string): string {
  return name
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function layoutFilePath(name: string): string {
  return path.join(LAYOUTS_DIR, `${sanitizeLayoutName(name)}.json`);
}

/** 保存済みレイアウト一覧 (お気に入り → 名前順)。 */
export async function listLayouts(): Promise<Layout[]> {
  try {
    const files = await readdir(LAYOUTS_DIR);
    const layouts: Layout[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(LAYOUTS_DIR, file), "utf-8");
        layouts.push(JSON.parse(content));
      } catch {
        /* 壊れたファイルはスキップ */
      }
    }
    // お気に入り優先、その後は名前順
    layouts.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return layouts;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** 1件取得 (見つからなければ null)。 */
export async function getLayout(name: string): Promise<Layout | null> {
  try {
    const content = await readFile(layoutFilePath(name), "utf-8");
    return JSON.parse(content);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/**
 * レイアウトを保存。
 * - 既に同名のファイルがあって、allowOverwrite=false の場合は { conflict: true } を返す
 *   (UI 側で「上書きしますか?」を出す材料にする)。
 * - allowOverwrite=true なら上書き保存。
 */
export async function saveLayout(
  input: Omit<Layout, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  allowOverwrite = false,
): Promise<{ conflict: true } | { conflict: false; saved: Layout }> {
  const cleanedName = sanitizeLayoutName(input.name);
  if (!cleanedName) {
    throw new Error("レイアウト名が空です");
  }
  const filePath = layoutFilePath(cleanedName);

  // 既存チェック
  const existing = await getLayout(cleanedName);
  if (existing && !allowOverwrite) {
    return { conflict: true };
  }

  const now = new Date().toISOString();
  const saved: Layout = {
    name: cleanedName,
    isFavorite: input.isFavorite ?? existing?.isFavorite ?? false,
    tables: input.tables,
    objects: input.objects,
    // 背景画像: 呼び出し側が常に最新値を渡す前提 (undefined/null なら背景なし)
    backgroundImagePath: input.backgroundImagePath ?? undefined,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };

  // 背景画像が変わった/外された場合は旧ファイルを物理削除 (孤立を防ぐ)
  const previousBg = existing?.backgroundImagePath;
  if (previousBg && previousBg !== saved.backgroundImagePath) {
    try {
      await unlink(path.join(LAYOUTS_BG_DIR, path.basename(previousBg)));
    } catch {
      /* noop */
    }
  }

  await writeJson(filePath, saved);
  revalidatePath("/layouts");
  revalidatePath("/shuffles");
  return { conflict: false, saved };
}

/** レイアウトを削除。背景画像ファイルがあれば一緒に消す。 */
export async function deleteLayout(name: string): Promise<void> {
  // 背景画像ファイルを先に削除しておく (レイアウト消えた後だとパスが取れない)
  const existing = await getLayout(name);
  if (existing?.backgroundImagePath) {
    const filename = path.basename(existing.backgroundImagePath);
    try {
      await unlink(path.join(LAYOUTS_BG_DIR, filename));
    } catch {
      /* noop */
    }
  }
  try {
    await unlink(layoutFilePath(name));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  revalidatePath("/layouts");
  revalidatePath("/shuffles");
}

// 背景画像のアップロードは app/api/layouts-bg/route.ts (POST) で行う。
// 物理削除は saveLayout / deleteLayout 内で自動的に行うので、ここには公開 API を出さない。

/** お気に入り状態をトグル。 */
export async function toggleLayoutFavorite(name: string): Promise<void> {
  const current = await getLayout(name);
  if (!current) return;
  const next: Layout = {
    ...current,
    isFavorite: !current.isFavorite,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(layoutFilePath(name), next);
  revalidatePath("/layouts");
  revalidatePath("/shuffles");
}

// ── シャッフル結果画像 ─────────────────────────────────────────────

/** 保存済み結果画像一覧 (新しい順)。 */
export async function listResultImages(): Promise<ResultImage[]> {
  try {
    const files = await readdir(RESULTS_PICTURES_DIR);
    const results: ResultImage[] = [];
    for (const file of files) {
      if (!file.toLowerCase().endsWith(".png")) continue;
      try {
        const fullPath = path.join(RESULTS_PICTURES_DIR, file);
        const s = await stat(fullPath);
        results.push({
          filename: file,
          path: `/data/results-pictures/${file}`,
          createdAt: s.mtime.toISOString(),
        });
      } catch {
        /* skip */
      }
    }
    // mtime 新しい順
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return results;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/**
 * シャッフル結果 PNG をアップロード保存。
 * - file: image/png 想定の File オブジェクト (FormData の "file")
 * - filename を指定すれば使う、なければ "result-{ISO}.png" を採番。
 * 返り値: 保存後の URL (例: "/data/results-pictures/xxx.png")
 */
export async function saveResultImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("file is required");
  }
  await mkdir(RESULTS_PICTURES_DIR, { recursive: true });
  // 一意になるよう ISO + 乱数を入れる
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `result-${stamp}.png`;
  const fullPath = path.join(RESULTS_PICTURES_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  revalidatePath("/results");
  return `/data/results-pictures/${filename}`;
}

/** 結果画像 1件を削除。 */
export async function deleteResultImage(filename: string): Promise<void> {
  // セーフティ: パストラバーサル防止 (filename は basename のみ受け付ける)
  const safe = path.basename(filename);
  try {
    await unlink(path.join(RESULTS_PICTURES_DIR, safe));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  revalidatePath("/results");
}
