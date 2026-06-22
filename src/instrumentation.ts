// Runs once when a new server instance starts, before it serves any
// request. Used to rebuild the Redis IP-block set from the DB — without
// this, a Redis flush (cache restart, FLUSHALL, etc.) would silently
// unblock every blocked IP until someone happened to re-save one.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { rebuildIpBlockSet } = await import("@/lib/ip-block");
    await rebuildIpBlockSet();
  }
}
