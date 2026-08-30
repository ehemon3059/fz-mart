# Security decisions

Deliberate choices, with the reasoning that produced them. The point of this
file is to stop settled questions from being re-argued every time someone new
reads the auth code — and, more importantly, to record what would have to
change for each decision to be reversed.

A decision here is not permanent. It is *conditional*, and each entry states
the condition. If you are changing something an entry covers, read its
"Reversal" line first: that is the trigger you are pulling.

---

## SD-001 — Session cookies are not signed

**Status:** accepted · **Applies to:** `fz_admin_session`, `fz_customer_session`,
`fz_admin_2fa`

Session cookies carry a bare random identifier with no HMAC or signature.

### Reasoning

A signature proves a value was minted by us and not modified. That is worth
paying for when the cookie *contains* something — a user id, a role, an expiry
— because without a signature the client could edit those fields and the server
would believe them.

Our cookies contain none of that. The value is an opaque lookup key, and the
data lives server-side in Redis:

- **Opaque.** `admin_session:<id>` → a JSON blob the client never sees and
  cannot influence. There is no field in the cookie to tamper with.
- **CSPRNG-generated.** `randomBytes(32).toString("hex")` from `node:crypto` —
  256 bits from the OS entropy pool. (Verified: no `Math.random`, `nanoid`, or
  timestamp-derived id appears in any token path. See `createSession` in
  `src/lib/auth.ts` and `createCustomerSession` in `src/lib/customer-session.ts`.)
- **Server-validated.** Every read goes through `getSession` /
  `getCustomerSessionById`, which resolve the id against Redis. A value we did
  not issue has no entry and is rejected.

So a forged cookie fails not because a signature check catches it, but because
there is nothing on the server to find. Guessing a live id means finding one
value in a 2^256 space — and the guess would have to be made against a rate-
limited login surface with no oracle to confirm progress. Signing adds a second
lock to a door whose first lock is already the strongest part.

The real cost of adding it is not the HMAC. It is the key: another secret to
provision, rotate, and keep consistent across the Next app and the worker
process, plus a rotation story that doesn't log everyone out. That is a
meaningful operational surface added for no threat it actually closes.

### Reversal

**This decision is void the moment a session cookie becomes self-contained.**

If a cookie ever carries its own claims — a JWT, a serialized session, a signed
user id, an "expires at" the server trusts — then the argument above no longer
holds, because the client would then possess data the server reads back and
believes. Such a token **must** be signed (and its expiry verified server-side
regardless).

Concretely, reverse this decision before merging anything that:

- puts a JWT or any encoded claim set in a cookie;
- moves session state out of Redis and into the cookie to avoid a lookup;
- adds a "remember me" token validated by its own contents rather than by a
  Redis entry.

---

## SD-002 — `Secure` is derived from the request, not from `NODE_ENV`

**Status:** accepted · **Supersedes:** `secure: process.env.NODE_ENV === "production"`

Every cookie we set derives its `Secure` attribute from
`shouldUseSecureCookies()` in `src/lib/cookie-security.ts`, which inspects the
request's protocol.

### Reasoning

`NODE_ENV === "production"` answers "is this a production build?", which is not
the question. The question is "is this connection encrypted?" — and those come
apart exactly where it hurts: a staging or preview box served over HTTPS but
built without `NODE_ENV=production` issued session cookies **without** `Secure`.
Any downgrade to plaintext on such a host leaks a live session id, and staging
boxes routinely hold a copy of production data.

The helper trusts `x-forwarded-proto` (and Vercel/Cloudflare equivalents)
*upward only*. This is the opposite of the rule in `src/lib/ip.ts`, and the
asymmetry is deliberate:

- In `ip.ts`, believing a forged header **grants** something — a rate-limit
  bypass — so forwarded headers are refused unless a trusted proxy overwrote
  them.
- Here, believing a forged `https` only makes a cookie **more** restricted. An
  attacker who lies about the scheme causes their own cookie to be withheld on
  plaintext requests. There is no gain in over-applying `Secure`.

Therefore every ambiguous case resolves to `secure: true`. Only a positive
identification of local plaintext development (an `http` scheme on a localhost
host) resolves to `false`, because there a `Secure` cookie would be dropped by
the browser and break dev login.

### Reversal

If a deployment ever terminates TLS at a hop that does **not** set
`x-forwarded-proto`, the fallback still returns `true` for non-local hosts, so
it fails safe. The entry to revisit is `isLocalhost` — widening it (to a LAN
range, a `.test` domain, a container hostname) widens the set of hosts allowed
to skip `Secure`. Do not add a host there that is reachable off the machine.

---

## SD-003 — Session limits are enforced server-side, in two independent windows

**Status:** accepted

Sessions carry `issuedAt` and are governed by two separate limits, both checked
in Redis, never by cookie expiry alone:

| | Admin | Customer |
|---|---|---|
| Idle (sliding TTL) | 8 hours | 30 days |
| Absolute (hard cap) | 7 days | 180 days |

### Reasoning

Cookie `maxAge` is a client-side hint; a copied cookie ignores it entirely. Both
limits are therefore enforced on read, in `getSession` /
`getCustomerSessionById`.

The two windows answer different threats and neither substitutes for the other.
The idle window retires a session nobody is using. The absolute cap bounds the
damage of a session someone *is* using — an attacker with a stolen cookie can
hold the idle window open indefinitely by making requests, so without a cap
their access never ends.

Cookie `maxAge` is set from the **absolute** cap, not the idle window: the
server slides the Redis TTL on activity, so a cookie expiring at the idle mark
would log out an active admin whose session Redis still considers valid.

Sessions written before `issuedAt` existed are treated as **expired**, not as
uncapped. This forces one logout on the deploy that introduced the field, which
is the correct direction — a missing cap must never read as an absent one.

### Reversal

Lengthening the admin idle window past a working day, or removing the absolute
cap to reduce re-logins, gives back exactly the property that bounds a stolen
cookie. If re-login friction becomes the complaint, the answer is a refresh
mechanism tied to a re-authentication, not a longer cap.

---

## SD-004 — A failed session revocation is escalated, never swallowed

**Status:** accepted

`revokeOtherAdminSessions` / `revokeCustomerSessions` do not throw — the
credential change that triggered them is already committed — but a failure is
reported to Sentry at error level (tag `security.session_revocation_failed`)
and retried on the `security` BullMQ queue with exponential backoff.

### Reasoning

These functions run at the one moment they matter most: someone is changing
their password *because* they believe the account is compromised. If Redis is
briefly unavailable then, the naive implementation logs a line and returns —
the attacker's session stays live and no one is told. The failure is invisible
precisely when it is most expensive.

Throwing is not the alternative: the password is already changed and the user
has been told it worked, so failing the action would be a lie about the state of
the system. Report-and-retry is the only option that keeps the user's view
accurate while ensuring the revocation actually completes.

Three distinct outcomes are reported, because they need different responses:

- `security.session_revocation_failed` — revocation failed; a retry is queued.
- `security.session_revocation_unrecoverable` — revocation failed **and** the
  retry could not be queued. Nothing will self-heal; a human must intervene.
- Worker exhaustion — the retry ran out of attempts. Logged as `GAVE UP`, and
  the job is kept (`removeOnFail: false`) so it remains findable.

`enqueueSecurityJob` deliberately does **not** use `safeEnqueue`. Every other
producer in `src/jobs/enqueue.ts` swallows failures because a dropped
notification is cosmetic; dropping *this* job would silently discard the safety
net itself.

### Reversal

If revocation ever becomes synchronous and blocking (e.g. the UI waits for
confirmation that other sessions are dead), the retry queue can be reconsidered
— but only alongside a way to tell the user it did not complete.

---

## SD-005 — The session index is pruned on read, not bounded by TTL alone

**Status:** accepted

`admin_sessions:<id>` and `customer_sessions:<id>` are Redis sets indexing live
session ids. Members are verified with a pipelined `EXISTS` and dead ones
removed on each read, in `readLiveSessionIds`. The set also carries a TTL as a
backstop.

### Reasoning

Redis expires keys, not references to them. A session key vanishing at its TTL
leaves its id sitting in the set forever, so an admin logging in daily
accumulates roughly one dead id per day.

A TTL on the set does not fix this, which is the trap worth recording: the TTL
is refreshed on every login, so the set belonging to a *regularly active*
account — the one with the most members — is precisely the one that never
expires. The TTL only reaps the index of an account that stopped logging in,
which is why it is kept as a backstop rather than relied on as the mechanism.

Pruning also makes the member count truthful, which a future "you have N active
sessions" screen needs and a TTL could never provide.

An errored `EXISTS` probe counts the id as **live**. Keeping a dead id is
harmless (deleting it again is a no-op); dropping a live one would remove our
ability to revoke a real session.

### Reversal

If these sets ever grow large enough that a pipelined `EXISTS` per member is
too costly, the replacement is a sorted set scored by expiry (`ZREMRANGEBYSCORE`
to prune in one call) — not dropping the prune and going back to a TTL.
