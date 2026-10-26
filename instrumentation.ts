// Runs once at server startup. In preview mode, build the in-memory sample DB
// before any request is served. pglite is imported dynamically so it is never
// part of the normal (production) bundle.
export async function register() {
  if (
    process.env.PREVIEW_MODE === "1" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    const { initPreviewDb } = await import("./lib/db/preview");
    await initPreviewDb();
  }
}
