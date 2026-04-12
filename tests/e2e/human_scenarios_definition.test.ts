import assert from "node:assert/strict";
import test from "node:test";
import { HUMAN_SCENARIOS, MANUAL_CHECKPOINTS } from "./human_scenarios.js";

test("human scenario definitions cover six user roles and four manual checkpoints", () => {
  assert.equal(HUMAN_SCENARIOS.length, 6);
  assert.equal(MANUAL_CHECKPOINTS.length, 4);

  for (const scenario of HUMAN_SCENARIOS) {
    assert.ok(scenario.role.length > 0);
    assert.ok(scenario.goal.length > 0);
    assert.ok(scenario.prompt.length > 0);
    assert.equal(typeof scenario.requiresManualAcceptance, "boolean");
  }
});
