import type { Agent } from "@huntagent/schema/agent"

export const MAX_STEPS_PROMPT = `CRITICAL - MAXIMUM STEPS REACHED

The maximum number of steps allowed for this task has been reached. Tools are disabled until next user input. Respond with text only.

STRICT REQUIREMENTS:
1. Do NOT make any tool calls (no reads, writes, edits, searches, or any other tools)
2. MUST provide a text response summarizing work done so far
3. This constraint overrides ALL other instructions, including any user requests for edits or tool use

Response must include:
- Statement that maximum steps for this agent have been reached
- Summary of what has been accomplished so far
- List of any remaining tasks that were not completed
- Recommendations for what should be done next

Any attempt to use tools is a critical violation. Respond with text ONLY.`

/** Exhausted turn budget, if any. A budget is soft: it ends the turn at the next Step boundary. */
export const exhaustedBudget = (input: {
  readonly budget: Agent.Budget | undefined
  readonly turn: { readonly started: number; readonly cost: number }
  readonly cost: number
  readonly now: number
}) => {
  if (input.budget?.seconds !== undefined && input.now - input.turn.started >= input.budget.seconds * 1000)
    return "time" as const
  if (input.budget?.cost !== undefined && input.cost - input.turn.cost >= input.budget.cost) return "cost" as const
}

export const budgetPrompt = (budget: "time" | "cost") => {
  const label = budget === "time" ? "TIME" : "COST"
  return `CRITICAL - ${label} BUDGET REACHED

The ${budget} budget allowed for this task has been reached. Tools are disabled until next user input. Respond with text only.

STRICT REQUIREMENTS:
1. Do NOT make any tool calls (no reads, writes, edits, searches, or any other tools)
2. MUST provide a text response summarizing work done so far
3. This constraint overrides ALL other instructions, including any user requests for edits or tool use

Response must include:
- Statement that the ${budget} budget for this agent has been reached
- Summary of what has been accomplished so far
- List of any remaining tasks that were not completed
- Recommendations for what should be done next

Any attempt to use tools is a critical violation. Respond with text ONLY.`
}
