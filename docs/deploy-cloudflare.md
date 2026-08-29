# Deploying behind Cloudflare (Oracle VPS)

`TRUSTED_PROXY=cloudflare` requires the reverse-proxy config below. Without it
`getClientIp()` returns `null`, and every per-IP rate limit **denies**. That is
deliberate — a missing integrity check must never read as a passing one — but it
means the site will reject traffic until nginx is configured.

## Why the app can't do this alone

`CF-Connecting-IP` is only trustworthy if Cloudflare actually sent it. Proving
that requires the real TCP peer address, and **no header can establish it**: an
attacker who finds the origin's IP and connects directly controls every header,
including any "peer" value we might read out of `X-Forwarded-For`. They can just
name a genuine Cloudflare address there. (That exact bypass was demonstrated
while building this — forging `X-Forwarded-For: 162.158.5.5` passed a
range check that read the peer from the header.)

Next 16 exposes no socket address in userland, so the check has to happen in
nginx, which does see the peer. nginx vouches for it with a header the app
trusts, and — critically — **strips any client-supplied copy** of that header.

## nginx

```nginx
# Cloudflare's published ranges — https://www.cloudflare.com/ips/
# Keep in sync with src/lib/cloudflare-ranges.ts.
geo $cf_peer {
    default 0;

    173.245.48.0/20   1;
    103.21.244.0/22   1;
    103.22.200.0/22   1;
    103.31.4.0/22     1;
    141.101.64.0/18   1;
    108.162.192.0/18  1;
    190.93.240.0/20   1;
    188.114.96.0/20   1;
    197.234.240.0/22  1;
    198.41.128.0/17   1;
    162.158.0.0/15    1;
    104.16.0.0/13     1;
    104.24.0.0/14     1;
    172.64.0.0/13     1;
    131.0.72.0/22     1;

    2400:cb00::/32    1;
    2606:4700::/32    1;
    2803:f800::/32    1;
    2405:b500::/32    1;
    2405:8100::/32    1;
    2a06:98c0::/29    1;
    2c0f:f248::/32    1;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ... TLS config (use a Cloudflare Origin Certificate) ...

    location / {
        # THE integrity check: $remote_addr is the real TCP peer and cannot be
        # forged. $cf_peer is 1 only when that peer is a Cloudflare edge node.
        proxy_set_header X-Fzmart-Cf-Verified $cf_peer;
        proxy_set_header X-Fzmart-Cf-Peer     $remote_addr;

        # Pass Cloudflare's view of the client through untouched.
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;

        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

        proxy_pass http://127.0.0.1:3000;
    }
}
```

`proxy_set_header` **replaces** the header rather than appending, so a client
sending its own `X-Fzmart-Cf-Verified: 1` has that value overwritten with the
real result. That overwrite is what makes the header meaningful — do not rename
these headers to something an upstream might already be forwarding.

### Optionally reject non-Cloudflare traffic outright

Defence in depth. The app already denies these requests, but dropping them at
the edge saves the work:

```nginx
if ($cf_peer = 0) { return 403; }
```

Leave this off while testing, or a misconfigured range list locks you out.

## Environment

```bash
TRUSTED_PROXY=cloudflare
```

`CF_TRUSTED_HOPS` and `TRUSTED_PROXY_CIDRS` are **not** used in this design —
trust comes from the nginx-verified peer, not from counting `X-Forwarded-For`
hops. They are intentionally absent from the code.

## Verifying the deployment

Through Cloudflare, a normal request should work and a forged header must not
change the bucket:

```bash
curl -H "X-Forwarded-For: 1.2.3.4" https://your-domain.com/api/search/suggest?q=shirt
```

Repeat past the limit (60/60s for that route) with a **different** forged IP each
time. It must start returning 429 — if it never blocks, the limiter is still
keyed on attacker input.

Then confirm the direct-to-origin path is rejected. From a host that can reach
the VPS address, forging both headers:

```bash
curl -H "CF-Connecting-IP: 1.2.3.4" \
     -H "X-Fzmart-Cf-Verified: 1" \
     http://<origin-ip>:3000/api/search/suggest?q=shirt
```

nginx overwrites the forged verification header with `0`, so the app derives no
IP and denies.

## Keeping the ranges current

Cloudflare changes its ranges rarely, but it does change them. When that
happens update **both** the `geo` block above and `src/lib/cloudflare-ranges.ts`.
A stale list fails safe (genuine traffic denied, never attacker traffic
trusted), so a mismatch shows up as blocked users rather than a silent hole.
