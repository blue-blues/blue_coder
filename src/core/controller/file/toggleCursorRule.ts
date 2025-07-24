import type { ToggleCursorRuleRequest } from "../../../shared/proto/file"
import { BluesAiCoderRulesToggles } from "../../../shared/proto/file"
import type { Controller } from "../index"
import { getWorkspaceState, updateWorkspaceState } from "../../../core/storage/state"
import { BluesAICoderRulesToggles as AppBluesAICoderRulesToggles } from "@shared/blues-ai-coder-rules"

/**
 * Toggles a Cursor rule (enable or disable)
 * @param controller The controller instance
 * @param request The toggle request
 * @returns The updated Cursor rule toggles
 */
export async function toggleCursorRule(
	controller: Controller,
	request: ToggleCursorRuleRequest,
): Promise<BluesAiCoderRulesToggles> {
	const { rulePath, enabled } = request

	if (!rulePath || typeof enabled !== "boolean") {
		console.error("toggleCursorRule: Missing or invalid parameters", {
			rulePath,
			enabled: typeof enabled === "boolean" ? enabled : `Invalid: ${typeof enabled}`,
		})
		throw new Error("Missing or invalid parameters for toggleCursorRule")
	}

	// Update the toggles in workspace state
	const toggles =
		((await getWorkspaceState(controller.context, "localCursorRulesToggles")) as AppBluesAICoderRulesToggles) || {}
	toggles[rulePath] = enabled
	await updateWorkspaceState(controller.context, "localCursorRulesToggles", toggles)

	// Get the current state to return in the response
	const cursorToggles =
		((await getWorkspaceState(controller.context, "localCursorRulesToggles")) as AppBluesAICoderRulesToggles) || {}

	return BluesAiCoderRulesToggles.create({
		toggles: cursorToggles,
	})
}
