import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AwardXpRequest {
  userId: string;
  xp: number;
  idempotencyKey: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { userId, xp, idempotencyKey } = (await req.json()) as Partial<AwardXpRequest>;

  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }
  if (typeof xp !== "number" || !Number.isFinite(xp) || xp <= 0) {
    return Response.json({ error: "xp must be a positive number" }, { status: 400 });
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return Response.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: inserted, error: insertError } = await supabase
    .from("practice_sessions")
    .upsert({
      user_id: userId,
      xp_awarded: xp,
      idempotency_key: idempotencyKey,
    }, {
      onConflict: "user_id,idempotency_key",
      ignoreDuplicates: true,
    })
    .select("id,user_id,xp_awarded,idempotency_key,created_at")
    .maybeSingle();

  if (!insertError && inserted) {
    return Response.json({
      awarded: true,
      replayed: false,
      session: inserted,
      xpAwarded: inserted.xp_awarded,
    });
  }

  // Conflict path: on conflict do nothing returns no inserted row; fetch previously computed result.
  if (!inserted) {
    const { data: existing, error: existingError } = await supabase
      .from("practice_sessions")
      .select("id,user_id,xp_awarded,idempotency_key,created_at")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingError || !existing) {
      return Response.json(
        { error: "Could not resolve duplicate replay", details: existingError?.message },
        { status: 500 },
      );
    }

    return Response.json({
      awarded: false,
      replayed: true,
      session: existing,
      xpAwarded: existing.xp_awarded,
    });
  }

  return Response.json({ error: insertError?.message ?? "Unknown insert error" }, { status: 500 });
});
