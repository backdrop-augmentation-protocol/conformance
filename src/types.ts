export type Role = "host" | "component" | "companion";
export type LifecycleState = "created" | "connected" | "initialized" | "running" | "paused" | "stopped" | "failed";
export interface ConformanceReport { protocol: "bap"; version: "0.1"; suite: string; specSource: string; startedAt: string; finishedAt: string; passed: number; failed: number; checks: Array<{ id: string; status: "passed" | "failed"; details?: string }>; }
