import { fileExistsAtPath, isDirectory, readDirectory } from "@utils/fs"
import { ensureRulesDirectoryExists, ensureWorkflowsDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { getGlobalState, getWorkspaceState, updateGlobalState, updateWorkspaceState } from "@core/storage/state"
import * as path from "path"
import fs from "fs/promises"
import { BluesAICoderRulesToggles } from "@shared/blues-ai-coder-rules"
import * as vscode from "vscode"

/**
 * Recursively traverses directory and finds all files, including checking for optional whitelisted file extension
 */
export async function readDirectoryRecursive(
	directoryPath: string,
	allowedFileExtension: string,
	excludedPaths: string[][] = [],
): Promise<string[]> {
	try {
		const entries = await readDirectory(directoryPath, excludedPaths)
		let results: string[] = []
		for (const entry of entries) {
			if (allowedFileExtension !== "") {
				const fileExtension = path.extname(entry)
				if (fileExtension !== allowedFileExtension) {
					continue
				}
			}
			results.push(entry)
		}
		return results
	} catch (error) {
		console.error(`Error reading directory ${directoryPath}: ${error}`)
		return []
	}
}

/**
 * Gets the up to date toggles
 */
export async function synchronizeRuleToggles(
	rulesDirectoryPath: string,
	currentToggles: BluesAICoderRulesToggles,
	allowedFileExtension: string = "",
	excludedPaths: string[][] = [],
): Promise<BluesAICoderRulesToggles> {
	// Create a copy of toggles to modify
	const updatedToggles = { ...currentToggles }

	try {
		const pathExists = await fileExistsAtPath(rulesDirectoryPath)

		if (pathExists) {
			const isDir = await isDirectory(rulesDirectoryPath)

			if (isDir) {
				// DIRECTORY CASE
				const filePaths = await readDirectoryRecursive(rulesDirectoryPath, allowedFileExtension, excludedPaths)
				const existingRulePaths = new Set<string>()

				for (const filePath of filePaths) {
					const ruleFilePath = path.resolve(rulesDirectoryPath, filePath)
					existingRulePaths.add(ruleFilePath)

					const pathHasToggle = ruleFilePath in updatedToggles
					if (!pathHasToggle) {
						updatedToggles[ruleFilePath] = true
					}
				}

				// Clean up toggles for non-existent files
				for (const togglePath in updatedToggles) {
					const pathExists = existingRulePaths.has(togglePath)
					if (!pathExists) {
						delete updatedToggles[togglePath]
					}
				}
			} else {
				// FILE CASE
				// Add toggle for this file
				const pathHasToggle = rulesDirectoryPath in updatedToggles
				if (!pathHasToggle) {
					updatedToggles[rulesDirectoryPath] = true
				}

				// Remove toggles for any other paths
				for (const togglePath in updatedToggles) {
					if (togglePath !== rulesDirectoryPath) {
						delete updatedToggles[togglePath]
					}
				}
			}
		} else {
			// PATH DOESN'T EXIST CASE
			// Clear all toggles since the path doesn't exist
			for (const togglePath in updatedToggles) {
				delete updatedToggles[togglePath]
			}
		}
	} catch (error) {
		console.error(`Failed to synchronize rule toggles for path: ${rulesDirectoryPath}`, error)
	}

	return updatedToggles
}

/**
 * Certain project rules have more than a single location where rules are allowed to be stored
 */
export function combineRuleToggles(
	toggles1: BluesAICoderRulesToggles,
	toggles2: BluesAICoderRulesToggles,
): BluesAICoderRulesToggles {
	return { ...toggles1, ...toggles2 }
}

/**
 * Read the content of rules files
 */
export const getRuleFilesTotalContent = async (rulesFilePaths: string[], basePath: string, toggles: BluesAICoderRulesToggles) => {
	const ruleFilesTotalContent = await Promise.all(
		rulesFilePaths.map(async (filePath) => {
			const ruleFilePath = path.resolve(basePath, filePath)
			const ruleFilePathRelative = path.relative(basePath, ruleFilePath)

			if (ruleFilePath in toggles && toggles[ruleFilePath] === false) {
				return null
			}

			return `${ruleFilePathRelative}\n` + (await fs.readFile(ruleFilePath, "utf8")).trim()
		}),
	).then((contents) => contents.filter(Boolean).join("\n\n"))
	return ruleFilesTotalContent
}

/**
 * Handles converting any directory into a file (specifically used for .bluesaicoderrules and .bluesaicoderrules/workflows)
 * The old .bluesaicoderrules file or .bluesaicoderrules/workflows file will be renamed to a default filename
 * Doesn't do anything if the dir already exists or doesn't exist
 * Returns whether there are any uncaught errors
 */
export async function ensureLocalBluesAICoderDirExists(
	bluesaicoterulePath: string,
	defaultRuleFilename: string,
): Promise<boolean> {
	try {
		const exists = await fileExistsAtPath(bluesaicoterulePath)

		if (exists && !(await isDirectory(bluesaicoterulePath))) {
			// logic to convert .bluesaicoterules file into directory, and rename the rules file to {defaultRuleFilename}
			const content = await fs.readFile(bluesaicoterulePath, "utf8")
			const tempPath = bluesaicoterulePath + ".bak"
			await fs.rename(bluesaicoterulePath, tempPath) // create backup
			try {
				await fs.mkdir(bluesaicoterulePath, { recursive: true })
				await fs.writeFile(path.join(bluesaicoterulePath, defaultRuleFilename), content, "utf8")
				await fs.unlink(tempPath).catch(() => {}) // delete backup

				return false // conversion successful with no errors
			} catch (conversionError) {
				// attempt to restore backup on conversion failure
				try {
					await fs.rm(bluesaicoterulePath, { recursive: true, force: true }).catch(() => {})
					await fs.rename(tempPath, bluesaicoterulePath) // restore backup
				} catch (restoreError) {}
				return true // in either case here we consider this an error
			}
		}
		// exists and is a dir or doesn't exist, either of these cases we dont need to handle here
		return false
	} catch (error) {
		return true
	}
}

/**
 * Create a rule file or workflow file
 */
export const createRuleFile = async (isGlobal: boolean, filename: string, cwd: string, type: string) => {
	try {
		let filePath: string
		if (isGlobal) {
			if (type === "workflow") {
				const globalBluesAICoderWorkflowFilePath = await ensureWorkflowsDirectoryExists()
				filePath = path.join(globalBluesAICoderWorkflowFilePath, filename)
			} else {
				const globalBluesAICoderRulesFilePath = await ensureRulesDirectoryExists()
				filePath = path.join(globalBluesAICoderRulesFilePath, filename)
			}
		} else {
			const localBluesAICoderRulesFilePath = path.resolve(cwd, GlobalFileNames.bluesaicoderRules)

			const hasError = await ensureLocalBluesAICoderDirExists(localBluesAICoderRulesFilePath, "default-rules.md")
			if (hasError === true) {
				return { filePath: null, fileExists: false }
			}

			await fs.mkdir(localBluesAICoderRulesFilePath, { recursive: true })

			if (type === "workflow") {
				const localWorkflowsFilePath = path.resolve(cwd, GlobalFileNames.workflows)

				const hasError = await ensureLocalBluesAICoderDirExists(localWorkflowsFilePath, "default-workflows.md")
				if (hasError === true) {
					return { filePath: null, fileExists: false }
				}

				await fs.mkdir(localWorkflowsFilePath, { recursive: true })

				filePath = path.join(localWorkflowsFilePath, filename)
			} else {
				// bluesaicoderules file creation
				filePath = path.join(localBluesAICoderRulesFilePath, filename)
			}
		}

		const fileExists = await fileExistsAtPath(filePath)

		if (fileExists) {
			return { filePath, fileExists }
		}

		await fs.writeFile(filePath, "", "utf8")

		return { filePath, fileExists: false }
	} catch (error) {
		return { filePath: null, fileExists: false }
	}
}

/**
 * Delete a rule file or workflow file
 */
export async function deleteRuleFile(
	context: vscode.ExtensionContext,
	rulePath: string,
	isGlobal: boolean,
	type: string,
): Promise<{ success: boolean; message: string }> {
	try {
		// Check if file exists
		const fileExists = await fileExistsAtPath(rulePath)
		if (!fileExists) {
			return {
				success: false,
				message: `File does not exist: ${rulePath}`,
			}
		}

		// Delete the file from disk
		await fs.rm(rulePath, { force: true })

		// Get the filename for messages
		const fileName = path.basename(rulePath)

		// Update the appropriate toggles
		if (isGlobal) {
			if (type === "workflow") {
				const toggles = ((await getGlobalState(context, "globalWorkflowToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateGlobalState(context, "globalWorkflowToggles", toggles)
			} else {
				const toggles =
					((await getGlobalState(context, "globalBluesAICoderRulesToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateGlobalState(context, "globalBluesAICoderRulesToggles", toggles)
			}
		} else {
			if (type === "workflow") {
				const toggles = ((await getWorkspaceState(context, "workflowToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateWorkspaceState(context, "workflowToggles", toggles)
			} else if (type === "cursor") {
				const toggles = ((await getWorkspaceState(context, "localCursorRulesToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateWorkspaceState(context, "localCursorRulesToggles", toggles)
			} else if (type === "windsurf") {
				const toggles =
					((await getWorkspaceState(context, "localWindsurfRulesToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateWorkspaceState(context, "localWindsurfRulesToggles", toggles)
			} else {
				const toggles =
					((await getWorkspaceState(context, "localBluesAICoderRulesToggles")) as BluesAICoderRulesToggles) || {}
				delete toggles[rulePath]
				await updateWorkspaceState(context, "localBluesAICoderRulesToggles", toggles)
			}
		}

		return {
			success: true,
			message: `File "${fileName}" deleted successfully`,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error(`Error deleting file: ${errorMessage}`, error)
		return {
			success: false,
			message: `Failed to delete file.`,
		}
	}
}
