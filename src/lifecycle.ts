import type { LifecycleState, Role } from "./types.js";

export type LifecycleAction = "connect" | "initialize" | "start" | "pause" | "resume" | "stop" | "restart" | "fail";

const transitions: Record<LifecycleState, Partial<Record<LifecycleAction, LifecycleState>>> = {
  created: { connect: "connected", fail: "failed" },
  connected: { initialize: "initialized", fail: "failed" },
  initialized: { start: "running", fail: "failed" },
  running: { pause: "paused", resume: "running", stop: "stopped", fail: "failed" },
  paused: { pause: "paused", resume: "running", stop: "stopped", fail: "failed" },
  stopped: { stop: "stopped", restart: "initialized" },
  failed: {},
};

export class InvalidLifecycleStateError extends Error {
  readonly code = "INVALID_STATE";
}

export class LifecycleMachine {
  public state: LifecycleState = "created";

  constructor(public readonly role: Role) {}

  apply(action: LifecycleAction): LifecycleState {
    const next = transitions[this.state][action];
    if (!next) throw new InvalidLifecycleStateError(`${this.role}: cannot ${action} from ${this.state}`);
    this.state = next;
    return next;
  }
}
