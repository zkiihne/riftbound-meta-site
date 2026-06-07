import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  try {
    const data = JSON.parse(
      readFileSync(join(process.cwd(), "data", "decklists", `${id}.json`), "utf-8")
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
