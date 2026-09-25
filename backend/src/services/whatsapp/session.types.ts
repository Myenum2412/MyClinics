/** Connection stage shown on the dashboard (unchanged contract: the frontend reads these values). */
export interface SessionState {
  connected: boolean;
  stage: "idle" | "qr" | "authenticated" | "ready" | "disconnected" | "error";
  updatedAt: string;
}
