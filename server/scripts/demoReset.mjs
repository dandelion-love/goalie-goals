// `npm run demo:reset --workspace server`: ask the demo server running on this machine to
// restore the seeded demo household. The route exists only with the mock identity on, and it
// refuses (409) when the data holds any account outside the demo domain.

const port = Number(process.env.PORT ?? 8080);
const res = await fetch(`http://localhost:${port}/api/dev/demo/reset`, { method: 'POST' }).catch(() => null);
if (!res) {
  console.error(`demo:reset: no server on port ${port}. Start it with npm run demo.`);
  process.exit(1);
}
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`demo:reset: refused (${res.status}): ${body.reason ?? body.error ?? 'no reason given'}`);
  process.exit(1);
}
console.log(`demo:reset: demo household restored as of ${body.date}.`);
