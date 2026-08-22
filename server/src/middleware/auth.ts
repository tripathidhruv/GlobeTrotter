import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import db from "../db.js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? ""
);

export interface AuthedRequest extends Request {
  userId?: string;
}

export async function verifySupabaseJwt(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing bearer token" });
  }
  const token = header.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "invalid token" });
  }
  req.userId = data.user.id;

  // Supabase Auth owns signup, but Trip.ownerId is a foreign key into our own
  // User table — so a freshly signed-up account has no row here and any write
  // fails with a FK violation. Materialise the row on first authenticated
  // request instead of relying on a signup hook.
  try {
    await db.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email ?? `${data.user.id}@unknown.local`,
        name: (data.user.user_metadata?.name as string | undefined) ?? null,
      },
    });
  } catch {
    // A concurrent request may have created it first; the row is what matters,
    // not which request won. Never block auth on this.
  }

  next();
}
