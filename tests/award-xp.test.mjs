import test from 'node:test';
import assert from 'node:assert/strict';
import { awardXpViaRpc } from '../supabase/functions/award-xp/service.js';
import { checkRateLimit, __resetRateLimitForTests } from '../supabase/functions/award-xp/rate-limit.js';

test('idempotent retry returns replay on second call', async () => {
  let seen = false;
  const client = {
    async rpc() {
      if (!seen) {
        seen = true;
        return { data: [{ idempotent_replay: false, xp_total: 20, level: 1, streak_current: 1, streak_longest: 1, grace_days_remaining: 2, progress_tier: 'root' }], error: null };
      }
      return { data: [{ idempotent_replay: true, xp_total: 20, level: 1, streak_current: 1, streak_longest: 1, grace_days_remaining: 2, progress_tier: 'root' }], error: null };
    },
  };

  const first = await awardXpViaRpc(client, { userId: 'u1', activityType: 'meditation_10', durationSec: 600, idempotencyKey: 'abc12345' });
  const second = await awardXpViaRpc(client, { userId: 'u1', activityType: 'meditation_10', durationSec: 600, idempotencyKey: 'abc12345' });

  assert.equal(first.row.idempotent_replay, false);
  assert.equal(second.row.idempotent_replay, true);
});

test('concurrent calls keep one non-replay and one replay', async () => {
  let claimed = false;
  const client = {
    async rpc() {
      const replay = claimed;
      claimed = true;
      return { data: [{ idempotent_replay: replay, xp_total: 20, level: 1, streak_current: 1, streak_longest: 1, grace_days_remaining: 2, progress_tier: 'root' }], error: null };
    },
  };

  const [a, b] = await Promise.all([
    awardXpViaRpc(client, { userId: 'u1', activityType: 'meditation_10', durationSec: 600, idempotencyKey: 'samekey11' }),
    awardXpViaRpc(client, { userId: 'u1', activityType: 'meditation_10', durationSec: 600, idempotencyKey: 'samekey11' }),
  ]);

  const replays = [a.row.idempotent_replay, b.row.idempotent_replay].sort();
  assert.deepEqual(replays, [false, true]);
});

test('rate limiter blocks after configured threshold', () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 20; i += 1) {
    assert.equal(checkRateLimit('award-xp:u1', 20, 1000).allowed, true);
  }
  const blocked = checkRateLimit('award-xp:u1', 20, 1000);
  assert.equal(blocked.allowed, false);
});
