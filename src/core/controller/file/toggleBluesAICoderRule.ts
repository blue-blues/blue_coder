import { ToggleBluesAICoderRules } from "../../../shared/proto/file"
import type { ToggleBluesAICoderRuleRequest } from "../../../shared/proto/file"
import type { Controller } from "../index"
import { getGlobalState, getWorkspaceState, updateGlobalState, updateWorkspaceState } from "../../../core/storage/state"
import { BluesAICoderRulesToggles as AppBluesAICoderRulesToggles } from "@shared/blues-ai-coder-rules"

/**
 * Toggles a Blues-AI Coder rule (enable or disable)
 * @param controller The controller instance
 * @param request The toggle request
 * @returns The updated Blues-AI Coder rule toggles
 */
export async function toggleBluesAICoderRule(
	controller: Controller,
	request: ToggleBluesAICoderRuleRequest,
): Promise<ToggleBluesAICoderRules> {
	const { isGlobal, rulePath, enabled } = request

	if (!rulePath || typeof enabled !== "boolean" || typeof isGlobal !== "boolean") {
		console.error("toggleBluesAICoderRule: Missing or invalid parameters", {
			rulePath,
			isGlobal: typeof isGlobal === "boolean" ? isGlobal : `Invalid: ${typeof isGlobal}`,
			enabled: typeof enabled === "boolean" ? enabled : `Invalid: ${typeof enabled}`,
		})
		throw new Error("Missing or invalid parameters for toggleBluesAICoderRule")
	}

	// This is the same core logic as in the original handler
	if (isGlobal) {
		const toggles =
			((await getGlobalState(controller.context, "globalBluesAICoderRulesToggles")) as AppBluesAICoderRulesToggles) || {}
		toggles[rulePath] = enabled
		await updateGlobalState(controller.context, "globalBluesAICoderRulesToggles", toggles)
	} else {
		const toggles =
			((await getWorkspaceState(controller.context, "localBluesAICoderRulesToggles")) as AppBluesAICoderRulesToggles) || {}
		toggles[rulePath] = enabled
		await updateWorkspaceState(controller.context, "localBluesAICoderRulesToggles", toggles)
	}

	// Get the current state to return in the response
	const globalToggles =
		((await getGlobalState(controller.context, "globalBluesAICoderRulesToggles")) as AppBluesAICoderRulesToggles) || {}
	const localToggles =
		((await getWorkspaceState(controller.context, "localBluesAICoderRulesToggles")) as AppBluesAICoderRulesToggles) || {}

	return ToggleBluesAICoderRules.create({
		globalBluesAiCoderRulesToggles: { toggles: globalToggles },
		localBluesAiCoderRulesToggles: { toggles: localToggles },
	})
}
