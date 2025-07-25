import { combineApiRequests } from "@shared/combineApiRequests"
import {
	ensureTaskDirectoryExists,
	saveApiConversationHistory,
	saveBluesAICoderMessages,
} from "@core/storage/disk"
import * as vscode from "vscode"
import { BluesAICoderMessage, ExtensionMessage } from "@shared/ExtensionMessage"
import { getApiMetrics } from "@shared/getApiMetrics"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import { findLastIndex } from "@shared/array"
import getFolderSize from "get-folder-size"
import os from "os"
import * as path from "path"
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker"
import { HistoryItem } from "@shared/HistoryItem"
import Anthropic from "@anthropic-ai/sdk"
import { TaskState } from "./TaskState"
import { getCwd, getDesktopDir } from "@utils/path"

interface MessageStateHandlerParams {
	context: vscode.ExtensionContext
	taskId: string
	taskIsFavorited?: boolean
	updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	taskState: TaskState
	checkpointTrackerErrorMessage?: string
}

export class MessageStateHandler {
	private apiConversationHistory: Anthropic.MessageParam[] = []
	private bluesaicoderMessages: BluesAICoderMessage[] = []
	private taskIsFavorited: boolean
	private checkpointTracker: CheckpointTracker | undefined
	private checkpointTrackerErrorMessage: string | undefined
	private updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	private context: vscode.ExtensionContext
	private taskId: string
	private taskState: TaskState

	constructor(params: MessageStateHandlerParams) {
		this.context = params.context
		this.taskId = params.taskId
		this.taskState = params.taskState
		this.taskIsFavorited = params.taskIsFavorited ?? false
		this.updateTaskHistory = params.updateTaskHistory
		this.checkpointTrackerErrorMessage = this.taskState.checkpointTrackerErrorMessage
	}

	setCheckpointTracker(tracker: CheckpointTracker | undefined) {
		this.checkpointTracker = tracker
	}

	getApiConversationHistory(): Anthropic.MessageParam[] {
		return this.apiConversationHistory
	}

	setApiConversationHistory(newHistory: Anthropic.MessageParam[]): void {
		this.apiConversationHistory = newHistory
	}

	getBluesAICoderMessages(): BluesAICoderMessage[] {
		return this.bluesaicoderMessages
	}

	setBluesAICoderMessages(newMessages: BluesAICoderMessage[]) {
		this.bluesaicoderMessages = newMessages
	}

	async saveBluesAICoderMessagesAndUpdateHistory(): Promise<void> {
		try {
			await saveBluesAICoderMessages(this.context, this.taskId, this.bluesaicoderMessages)

			// combined as they are in ChatView
			const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.bluesaicoderMessages.slice(1))))
			const taskMessage = this.bluesaicoderMessages[0] // first message is always the task say
			const lastRelevantMessage =
				this.bluesaicoderMessages[
					findLastIndex(
						this.bluesaicoderMessages,
						(message) => !(message.ask === "resume_task" || message.ask === "resume_completed_task"),
					)
				]
			const taskDir = await ensureTaskDirectoryExists(this.context, this.taskId)
			let taskDirSize = 0
			try {
				// getFolderSize.loose silently ignores errors
				// returns # of bytes, size/1000/1000 = MB
				taskDirSize = await getFolderSize.loose(taskDir)
			} catch (error) {
				console.error("Failed to get task directory size:", taskDir, error)
			}
			const cwd = await getCwd(getDesktopDir())
			await this.updateTaskHistory({
				id: this.taskId,
				ts: lastRelevantMessage.ts,
				task: taskMessage.text ?? "",
				tokensIn: apiMetrics.totalTokensIn,
				tokensOut: apiMetrics.totalTokensOut,
				cacheWrites: apiMetrics.totalCacheWrites,
				cacheReads: apiMetrics.totalCacheReads,
				totalCost: apiMetrics.totalCost,
				size: taskDirSize,
				shadowGitConfigWorkTree: await this.checkpointTracker?.getShadowGitConfigWorkTree(),
				cwdOnTaskInitialization: cwd,
				conversationHistoryDeletedRange: this.taskState.conversationHistoryDeletedRange,
				isFavorited: this.taskIsFavorited,
				checkpointTrackerErrorMessage: this.taskState.checkpointTrackerErrorMessage,
			})
		} catch (error) {
			console.error("Failed to save bluesaicoder messages:", error)
		}
	}

	async addToApiConversationHistory(message: Anthropic.MessageParam) {
		this.apiConversationHistory.push(message)
		await saveApiConversationHistory(this.context, this.taskId, this.apiConversationHistory)
	}

	async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]): Promise<void> {
		this.apiConversationHistory = newHistory
		await saveApiConversationHistory(this.context, this.taskId, this.apiConversationHistory)
	}

	async addToBluesAICoderMessages(message: BluesAICoderMessage) {
		// these values allow us to reconstruct the conversation history at the time this bluesaicoder message was created
		// it's important that apiConversationHistory is initialized before we add bluesaicoder messages
		message.conversationHistoryIndex = this.apiConversationHistory.length - 1 // NOTE: this is the index of the last added message which is the user message, and once the bluesaicodermessages have been presented we update the apiconversationhistory with the completed assistant message. This means when resetting to a message, we need to +1 this index to get the correct assistant message that this tool use corresponds to
		message.conversationHistoryDeletedRange = this.taskState.conversationHistoryDeletedRange
		this.bluesaicoderMessages.push(message)
		await this.saveBluesAICoderMessagesAndUpdateHistory()
	}

	async overwriteBluesAICoderMessages(newMessages: BluesAICoderMessage[]) {
		this.bluesaicoderMessages = newMessages
		await this.saveBluesAICoderMessagesAndUpdateHistory()
	}

	async updateBluesAICoderMessage(index: number, updates: Partial<BluesAICoderMessage>): Promise<void> {
		if (index < 0 || index >= this.bluesaicoderMessages.length) {
			throw new Error(`Invalid message index: ${index}`)
		}

		// Apply updates to the message
		Object.assign(this.bluesaicoderMessages[index], updates)

		// Save changes and update history
		await this.saveBluesAICoderMessagesAndUpdateHistory()
	}
}
