export type Role = "host" | "component" | "companion";
export type LifecycleState = "created" | "initializing" | "ready" | "running" | "paused" | "stopped" | "destroyed";
export interface ConformanceReport { protocol: "bap"; version: "0.1"; suite: string; specSource: string; startedAt: string; finishedAt: string; passed: number; failed: number; checks: Array<{ id: string; status: "passed" | "failed"; details?: string }>; }
