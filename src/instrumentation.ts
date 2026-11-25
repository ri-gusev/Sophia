export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" &&
      process.env.ACCOUNT_MODE === "proxy") {
    const { startAccountCleanup } = await import("./features/account/server/cleanup");
    startAccountCleanup();
  }
}
