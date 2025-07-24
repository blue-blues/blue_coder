import path from "path"
import { ensureRulesDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { fileExistsAtPath, isDirectory, readDirectory } from "@utils/fs"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import { BluesAICoderRulesToggles } from "@shared/blues-ai-coder-rules"
import { getGlobalState, getWorkspaceState, updateGlobalState, updateWorkspaceState } from "@core/storage/state"
import * as vscode from "vscode"
import { synchronizeRuleToggles, getRuleFilesTotalContent } from "@core/context/instructions/user-instructions/rule-helpers"

export const getGlobalBluesAICoderRules = async (globalBluesAICoderRulesFilePath: string, toggles: BluesAICoderRulesToggles) => {
	if (await fileExistsAtPath(globalBluesAICoderRulesFilePath)) {
		if (await isDirectory(globalBluesAICoderRulesFilePath)) {
			try {
				const rulesFilePaths = await readDirectory(globalBluesAICoderRulesFilePath)
				const rulesFilesTotalContent = await getRuleFilesTotalContent(rulesFilePaths, globalBluesAICoderRulesFilePath, toggles)
				if (rulesFilesTotalContent) {
					const bluesaicoderRulesFileInstructions = formatResponse.bluesaicoderRulesGlobalDirectoryInstructions(
						globalBluesAICoderRulesFilePath,
						rulesFilesTotalContent,
					)
					return bluesaicoderRulesFileInstructions
				}
			} catch {
				console.error(`Failed to read .bluesaicoderules directory at ${globalBluesAICoderRulesFilePath}`)
			}
		} else {
			console.error(`${globalBluesAICoderRulesFilePath} is not a directory`)
			return undefined
		}
	}

	return undefined
}

export const getLocalBluesAICoderRules = async (cwd: string, toggles: BluesAICoderRulesToggles) => {
	const bluesaicoderRulesFilePath = path.resolve(cwd, GlobalFileNames.bluesaicoderRules)

	let bluesaicoderRulesFileInstructions: string | undefined

	if (await fileExistsAtPath(bluesaicoderRulesFilePath)) {
		if (await isDirectory(bluesaicoderRulesFilePath)) {
			try {
				const rulesFilePaths = await readDirectory(bluesaicoderRulesFilePath, [[".bluesaicoderules", "workflows"]])

				const rulesFilesTotalContent = await getRuleFilesTotalContent(rulesFilePaths, cwd, toggles)
				if (rulesFilesTotalContent) {
					bluesaicoderRulesFileInstructions = formatResponse.bluesaicoderRulesLocalDirectoryInstructions(cwd, rulesFilesTotalContent)
				}
			} catch {
				console.error(`Failed to read .bluesaicoderules directory at ${bluesaicoderRulesFilePath}`)
			}
		} else {
			try {
				if (bluesaicoderRulesFilePath in toggles && toggles[bluesaicoderRulesFilePath] !== false) {
					const ruleFileContent = (await fs.readFile(bluesaicoderRulesFilePath, "utf8")).trim()
					if (ruleFileContent) {
						bluesaicoderRulesFileInstructions = formatResponse.bluesaicoderRulesLocalFileInstructions(cwd, ruleFileContent)
					}
				}
			} catch {
				console.error(`Failed to read .bluesaicoderules file at ${bluesaicoderRulesFilePath}`)
			}
		}
	}

	return bluesaicoderRulesFileInstructions
}

export async function refreshBluesAICoderRulesToggles(
	context: vscode.ExtensionContext,
	workingDirectory: string,
): Promise<{
	globalToggles: BluesAICoderRulesToggles
	localToggles: BluesAICoderRulesToggles
}> {
	// Global toggles
	const globalBluesAiCoderRulesToggles =
		((await getGlobalState(context, "globalBluesAICoderRulesToggles")) as BluesAICoderRulesToggles) || {}
	const globalClineRulesFilePath = await ensureRulesDirectoryExists()
	const updatedGlobalToggles = await synchronizeRuleToggles(globalClineRulesFilePath, globalBluesAiCoderRulesToggles)
	await updateGlobalState(context, "globalBluesAICoderRulesToggles", updatedGlobalToggles)

	// Local toggles
	const localBluesAiCoderRulesToggles =
		((await getWorkspaceState(context, "localBluesAICoderRulesToggles")) as BluesAICoderRulesToggles) || {}
	const localBluesAICoderRulesFilePath = path.resolve(workingDirectory, GlobalFileNames.bluesaicoderRules)
	const updatedLocalToggles = await synchronizeRuleToggles(localBluesAICoderRulesFilePath, localBluesAiCoderRulesToggles, "", [
		[".bluesaicoderules", "workflows"],
	])
	await updateWorkspaceState(context, "localBluesAICoderRulesToggles", updatedLocalToggles)

	return {
		globalToggles: updatedGlobalToggles,
		localToggles: updatedLocalToggles,
	}
}
