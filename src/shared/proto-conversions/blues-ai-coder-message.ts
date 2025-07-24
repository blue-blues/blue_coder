import {
	BluesAICoderMessage as AppBluesAICoderMessage,
	BluesAICoderAsk as AppBluesAICoderAsk,
	BluesAICoderSay as AppBluesAICoderSay,
} from "@shared/ExtensionMessage"

import {
	BluesAiCoderMessage as ProtoBluesAiCoderMessage,
	BluesAiCoderMessageType,
	BluesAiCoderAsk,
	BluesAiCoderSay,
} from "@shared/proto/ui"

// Helper function to convert BluesAICoderAsk string to enum
function convertBluesAICoderAskToProtoEnum(ask: AppBluesAICoderAsk | undefined): BluesAiCoderAsk | undefined {
	if (!ask) {
		return undefined
	}

	const mapping: Record<AppBluesAICoderAsk, BluesAiCoderAsk> = {
		followup: BluesAiCoderAsk.FOLLOWUP,
		plan_mode_respond: BluesAiCoderAsk.PLAN_MODE_RESPOND,
		command: BluesAiCoderAsk.COMMAND,
		command_output: BluesAiCoderAsk.COMMAND_OUTPUT,
		completion_result: BluesAiCoderAsk.COMPLETION_RESULT,
		tool: BluesAiCoderAsk.TOOL,
		api_req_failed: BluesAiCoderAsk.API_REQ_FAILED,
		resume_task: BluesAiCoderAsk.RESUME_TASK,
		resume_completed_task: BluesAiCoderAsk.RESUME_COMPLETED_TASK,
		mistake_limit_reached: BluesAiCoderAsk.MISTAKE_LIMIT_REACHED,
		auto_approval_max_req_reached: BluesAiCoderAsk.AUTO_APPROVAL_MAX_REQ_REACHED,
		browser_action_launch: BluesAiCoderAsk.BROWSER_ACTION_LAUNCH,
		use_mcp_server: BluesAiCoderAsk.USE_MCP_SERVER,
		new_task: BluesAiCoderAsk.NEW_TASK,
		condense: BluesAiCoderAsk.CONDENSE,
		report_bug: BluesAiCoderAsk.REPORT_BUG,
	}

	const result = mapping[ask]
	if (result === undefined) {
		console.warn(`Unknown BluesAICoderAsk value: ${ask}`)
	}
	return result
}

// Helper function to convert BluesAICoderAsk enum to string
function convertProtoEnumToBluesAICoderAsk(ask: BluesAiCoderAsk): AppBluesAICoderAsk | undefined {
	if (ask === BluesAiCoderAsk.UNRECOGNIZED) {
		console.warn("Received UNRECOGNIZED BluesAICoderAsk enum value")
		return undefined
	}

	const mapping: Record<Exclude<BluesAiCoderAsk, BluesAiCoderAsk.UNRECOGNIZED>, AppBluesAICoderAsk> = {
		[BluesAiCoderAsk.FOLLOWUP]: "followup",
		[BluesAiCoderAsk.PLAN_MODE_RESPOND]: "plan_mode_respond",
		[BluesAiCoderAsk.COMMAND]: "command",
		[BluesAiCoderAsk.COMMAND_OUTPUT]: "command_output",
		[BluesAiCoderAsk.COMPLETION_RESULT]: "completion_result",
		[BluesAiCoderAsk.TOOL]: "tool",
		[BluesAiCoderAsk.API_REQ_FAILED]: "api_req_failed",
		[BluesAiCoderAsk.RESUME_TASK]: "resume_task",
		[BluesAiCoderAsk.RESUME_COMPLETED_TASK]: "resume_completed_task",
		[BluesAiCoderAsk.MISTAKE_LIMIT_REACHED]: "mistake_limit_reached",
		[BluesAiCoderAsk.AUTO_APPROVAL_MAX_REQ_REACHED]: "auto_approval_max_req_reached",
		[BluesAiCoderAsk.BROWSER_ACTION_LAUNCH]: "browser_action_launch",
		[BluesAiCoderAsk.USE_MCP_SERVER]: "use_mcp_server",
		[BluesAiCoderAsk.NEW_TASK]: "new_task",
		[BluesAiCoderAsk.CONDENSE]: "condense",
		[BluesAiCoderAsk.REPORT_BUG]: "report_bug",
	}

	return mapping[ask]
}

// Helper function to convert BluesAICoderSay string to enum
function convertBluesAICoderSayToProtoEnum(say: AppBluesAICoderSay | undefined): BluesAiCoderSay | undefined {
	if (!say) {
		return undefined
	}

	const mapping: Record<AppBluesAICoderSay, BluesAiCoderSay> = {
		task: BluesAiCoderSay.TASK,
		error: BluesAiCoderSay.ERROR,
		api_req_started: BluesAiCoderSay.API_REQ_STARTED,
		api_req_finished: BluesAiCoderSay.API_REQ_FINISHED,
		text: BluesAiCoderSay.TEXT,
		reasoning: BluesAiCoderSay.REASONING,
		completion_result: BluesAiCoderSay.COMPLETION_RESULT_SAY,
		user_feedback: BluesAiCoderSay.USER_FEEDBACK,
		user_feedback_diff: BluesAiCoderSay.USER_FEEDBACK_DIFF,
		api_req_retried: BluesAiCoderSay.API_REQ_RETRIED,
		command: BluesAiCoderSay.COMMAND_SAY,
		command_output: BluesAiCoderSay.COMMAND_OUTPUT_SAY,
		tool: BluesAiCoderSay.TOOL_SAY,
		shell_integration_warning: BluesAiCoderSay.SHELL_INTEGRATION_WARNING,
		browser_action_launch: BluesAiCoderSay.BROWSER_ACTION_LAUNCH_SAY,
		browser_action: BluesAiCoderSay.BROWSER_ACTION,
		browser_action_result: BluesAiCoderSay.BROWSER_ACTION_RESULT,
		mcp_server_request_started: BluesAiCoderSay.MCP_SERVER_REQUEST_STARTED,
		mcp_server_response: BluesAiCoderSay.MCP_SERVER_RESPONSE,
		mcp_notification: BluesAiCoderSay.MCP_NOTIFICATION,
		use_mcp_server: BluesAiCoderSay.USE_MCP_SERVER_SAY,
		diff_error: BluesAiCoderSay.DIFF_ERROR,
		deleted_api_reqs: BluesAiCoderSay.DELETED_API_REQS,
		blues_ai_coder_ignore_error: BluesAiCoderSay.BLUES_AI_CODER_IGNORE_ERROR,
		checkpoint_created: BluesAiCoderSay.CHECKPOINT_CREATED,
		load_mcp_documentation: BluesAiCoderSay.LOAD_MCP_DOCUMENTATION,
		info: BluesAiCoderSay.INFO,
	}

	const result = mapping[say]
	if (result === undefined) {
		console.warn(`Unknown BluesAICoderSay value: ${say}`)
	}
	return result
}

// Helper function to convert BluesAICoderSay enum to string
function convertProtoEnumToBluesAICoderSay(say: BluesAiCoderSay): AppBluesAICoderSay | undefined {
	if (say === BluesAiCoderSay.UNRECOGNIZED) {
		console.warn("Received UNRECOGNIZED BluesAICoderSay enum value")
		return undefined
	}

	const mapping: Record<Exclude<BluesAiCoderSay, BluesAiCoderSay.UNRECOGNIZED>, AppBluesAICoderSay> = {
		[BluesAiCoderSay.TASK]: "task",
		[BluesAiCoderSay.ERROR]: "error",
		[BluesAiCoderSay.API_REQ_STARTED]: "api_req_started",
		[BluesAiCoderSay.API_REQ_FINISHED]: "api_req_finished",
		[BluesAiCoderSay.TEXT]: "text",
		[BluesAiCoderSay.REASONING]: "reasoning",
		[BluesAiCoderSay.COMPLETION_RESULT_SAY]: "completion_result",
		[BluesAiCoderSay.USER_FEEDBACK]: "user_feedback",
		[BluesAiCoderSay.USER_FEEDBACK_DIFF]: "user_feedback_diff",
		[BluesAiCoderSay.API_REQ_RETRIED]: "api_req_retried",
		[BluesAiCoderSay.COMMAND_SAY]: "command",
		[BluesAiCoderSay.COMMAND_OUTPUT_SAY]: "command_output",
		[BluesAiCoderSay.TOOL_SAY]: "tool",
		[BluesAiCoderSay.SHELL_INTEGRATION_WARNING]: "shell_integration_warning",
		[BluesAiCoderSay.BROWSER_ACTION_LAUNCH_SAY]: "browser_action_launch",
		[BluesAiCoderSay.BROWSER_ACTION]: "browser_action",
		[BluesAiCoderSay.BROWSER_ACTION_RESULT]: "browser_action_result",
		[BluesAiCoderSay.MCP_SERVER_REQUEST_STARTED]: "mcp_server_request_started",
		[BluesAiCoderSay.MCP_SERVER_RESPONSE]: "mcp_server_response",
		[BluesAiCoderSay.MCP_NOTIFICATION]: "mcp_notification",
		[BluesAiCoderSay.USE_MCP_SERVER_SAY]: "use_mcp_server",
		[BluesAiCoderSay.DIFF_ERROR]: "diff_error",
		[BluesAiCoderSay.DELETED_API_REQS]: "deleted_api_reqs",
		[BluesAiCoderSay.BLUES_AI_CODER_IGNORE_ERROR]: "blues_ai_coder_ignore_error",
		[BluesAiCoderSay.CHECKPOINT_CREATED]: "checkpoint_created",
		[BluesAiCoderSay.LOAD_MCP_DOCUMENTATION]: "load_mcp_documentation",
		[BluesAiCoderSay.INFO]: "info",
	}

	return mapping[say]
}

/**
	* Convert application BluesAICoderMessage to proto BluesAICoderMessage
	*/
export function convertBluesAICoderMessageToProto(message: AppBluesAICoderMessage): ProtoBluesAiCoderMessage {
	// For sending messages, we need to provide values for required proto fields
	const askEnum = message.ask ? convertBluesAICoderAskToProtoEnum(message.ask) : undefined
	const sayEnum = message.say ? convertBluesAICoderSayToProtoEnum(message.say) : undefined

	// Determine appropriate enum values based on message type
	let finalAskEnum: BluesAiCoderAsk = BluesAiCoderAsk.FOLLOWUP // Proto default
	let finalSayEnum: BluesAiCoderSay = BluesAiCoderSay.TEXT // Proto default

	if (message.type === "ask") {
		finalAskEnum = askEnum ?? BluesAiCoderAsk.FOLLOWUP // Use FOLLOWUP as default for ask messages
	} else if (message.type === "say") {
		finalSayEnum = sayEnum ?? BluesAiCoderSay.TEXT // Use TEXT as default for say messages
	}

	const protoMessage: ProtoBluesAiCoderMessage = {
		ts: message.ts,
		type: message.type === "ask" ? BluesAiCoderMessageType.ASK : BluesAiCoderMessageType.SAY,
		ask: finalAskEnum,
		say: finalSayEnum,
		text: message.text ?? "",
		reasoning: message.reasoning ?? "",
		images: message.images ?? [],
		files: message.files ?? [],
		partial: message.partial ?? false,
		lastCheckpointHash: message.lastCheckpointHash ?? "",
		isCheckpointCheckedOut: message.isCheckpointCheckedOut ?? false,
		isOperationOutsideWorkspace: message.isOperationOutsideWorkspace ?? false,
		conversationHistoryIndex: message.conversationHistoryIndex ?? 0,
		conversationHistoryDeletedRange: message.conversationHistoryDeletedRange
			? {
					startIndex: message.conversationHistoryDeletedRange[0],
					endIndex: message.conversationHistoryDeletedRange[1],
				}
			: undefined,
	}

	return protoMessage
}

/**
	* Convert proto BluesAICoderMessage to application BluesAICoderMessage
	*/
export function convertProtoToBluesAICoderMessage(protoMessage: ProtoBluesAiCoderMessage): AppBluesAICoderMessage {
	const message: AppBluesAICoderMessage = {
		ts: protoMessage.ts,
		type: protoMessage.type === BluesAiCoderMessageType.ASK ? "ask" : "say",
	}

	// Convert ask enum to string
	if (protoMessage.type === BluesAiCoderMessageType.ASK) {
		const ask = convertProtoEnumToBluesAICoderAsk(protoMessage.ask)
		if (ask !== undefined) {
			message.ask = ask
		}
	}

	// Convert say enum to string
	if (protoMessage.type === BluesAiCoderMessageType.SAY) {
		const say = convertProtoEnumToBluesAICoderSay(protoMessage.say)
		if (say !== undefined) {
			message.say = say
		}
	}

	// Convert other fields - preserve empty strings as they may be intentional
	if (protoMessage.text !== "") {
		message.text = protoMessage.text
	}
	if (protoMessage.reasoning !== "") {
		message.reasoning = protoMessage.reasoning
	}
	if (protoMessage.images.length > 0) {
		message.images = protoMessage.images
	}
	if (protoMessage.files.length > 0) {
		message.files = protoMessage.files
	}
	if (protoMessage.partial) {
		message.partial = protoMessage.partial
	}
	if (protoMessage.lastCheckpointHash !== "") {
		message.lastCheckpointHash = protoMessage.lastCheckpointHash
	}
	if (protoMessage.isCheckpointCheckedOut) {
		message.isCheckpointCheckedOut = protoMessage.isCheckpointCheckedOut
	}
	if (protoMessage.isOperationOutsideWorkspace) {
		message.isOperationOutsideWorkspace = protoMessage.isOperationOutsideWorkspace
	}
	if (protoMessage.conversationHistoryIndex !== 0) {
		message.conversationHistoryIndex = protoMessage.conversationHistoryIndex
	}

	// Convert conversationHistoryDeletedRange from object to tuple
	if (protoMessage.conversationHistoryDeletedRange) {
		message.conversationHistoryDeletedRange = [
			protoMessage.conversationHistoryDeletedRange.startIndex,
			protoMessage.conversationHistoryDeletedRange.endIndex,
		]
	}

	return message
}
