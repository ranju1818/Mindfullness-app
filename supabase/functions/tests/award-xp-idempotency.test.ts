import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";

const baseUrl = Deno.env.get("SUPABASE_FUNCTIONS_URL") ?? "http://127.0.0.1:54321/functions/v1";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "test-key";

async function awardXp(payload: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/award-xp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  return {
    status: res.status,
    body: await res.json(),
  };
}

Deno.test("duplicate retries with same idempotency key return original result", async () => {
  const userId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  const first = await awardXp({ userId, xp: 15, idempotencyKey });
  const second = await awardXp({ userId, xp: 15, idempotencyKey });

  assertEquals(first.status, 200);
  assertEquals(second.status, 200);
  assertEquals(first.body.replayed, false);
  assertEquals(second.body.replayed, true);
  assertEquals(second.body.session.id, first.body.session.id);
  assertEquals(second.body.xpAwarded, first.body.xpAwarded);
});

Deno.test("legitimate new events with new idempotency key create new awards", async () => {
  const userId = crypto.randomUUID();

  const first = await awardXp({ userId, xp: 20, idempotencyKey: crypto.randomUUID() });
  const second = await awardXp({ userId, xp: 20, idempotencyKey: crypto.randomUUID() });

  assertEquals(first.status, 200);
  assertEquals(second.status, 200);
  assertEquals(first.body.replayed, false);
  assertEquals(second.body.replayed, false);
  assertEquals(first.body.session.id === second.body.session.id, false);
});
