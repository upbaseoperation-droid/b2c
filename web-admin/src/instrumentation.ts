export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    const g = globalThis as unknown as { __upbaseVnCartBridgeStarted?: boolean };
    if (g.__upbaseVnCartBridgeStarted) return;
    g.__upbaseVnCartBridgeStarted = true;

    try {
      const { spawn } = await import('node:child_process');
      const path = await import('node:path');
      const fs = await import('node:fs');
      const scriptPath = path.join(process.cwd(), 'scripts', 'vn-tiktok-cart-bridge.mjs');
      if (fs.existsSync(scriptPath)) {
        const child = spawn(process.execPath, [scriptPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();
      }
    } catch {
      // Non-fatal in standalone environments
    }
  }
}
