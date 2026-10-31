import { ZodError, type ZodType } from "zod";
import { ApiError, ValidationError } from "./errors";

function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return Response.json(
      { error: "Validation failed", details: zodDetails(err) },
      { status: 400 },
    );
  }
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.message, details: err.details },
      { status: err.status },
    );
  }
  const code = (err as { code?: string })?.code;
  if (code === "SQLITE_CONSTRAINT_UNIQUE")
    return Response.json({ error: "Duplicate value" }, { status: 409 });
  if (code?.startsWith("SQLITE_CONSTRAINT")) {
    return Response.json(
      { error: "Operation violates a data constraint" },
      { status: 409 },
    );
  }
  console.error(err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

/** Run a handler body: JSON on success (204 if it returns undefined), uniform JSON errors otherwise. */
export async function run(
  fn: () => unknown | Promise<unknown>,
  status = 200,
): Promise<Response> {
  try {
    const data = await fn();
    return data === undefined
      ? new Response(null, { status: 204 })
      : Response.json(data, { status });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function readJson<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  return schema.parse(body);
}

export function readQuery<T>(req: Request, schema: ZodType<T>): T {
  const params: Record<string, string> = {};
  for (const [k, v] of new URL(req.url).searchParams)
    if (v !== "") params[k] = v;
  return schema.parse(params);
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError("Invalid id");
  return id;
}

export type IdContext = { params: Promise<{ id: string }> };
export const idOf = async (ctx: IdContext) => parseId((await ctx.params).id);
