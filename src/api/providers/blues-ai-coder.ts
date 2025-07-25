import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler } from "../"
import { BluesAICoderAccountService } from "@/services/account/BluesAICoderAccountService"
import { ModelInfo, openRouterDefaultModelId, openRouterDefaultModelInfo } from "@shared/api"
import { createOpenRouterStream } from "../transform/openrouter-stream"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import axios from "axios"
import { OpenRouterErrorResponse } from "./types"
import { withRetry } from "../retry"
import { AuthService } from "@/services/auth/AuthService"
import OpenAI from "openai"
import { version as extensionVersion } from "../../../package.json"
import { shouldSkipReasoningForModel } from "@utils/model-utils"
import { BLUES_AI_CODER_ACCOUNT_AUTH_ERROR_MESSAGE } from "@/shared/BluesAiCoderAccount"
import { bluesAICoderEnvConfig } from "@/config"

interface BluesAICoderHandlerOptions {
	taskId?: string
	reasoningEffort?: string
	thinkingBudgetTokens?: number
	openRouterProviderSorting?: string
	openRouterModelId?: string
	openRouterModelInfo?: ModelInfo
	bluesAiCoderAccountId?: string
}

export class BluesAICoderHandler implements ApiHandler {
	private options: BluesAICoderHandlerOptions
	private bluesAICoderAccountService = BluesAICoderAccountService.getInstance()
	private _authService: AuthService
	private client: OpenAI | undefined
	private readonly _baseUrl = bluesAICoderEnvConfig.apiBaseUrl
	lastGenerationId?: string
	private counter = 0

	constructor(options: BluesAICoderHandlerOptions) {
		this.options = options
		this._authService = AuthService.getInstance()
	}

	private async ensureClient(): Promise<OpenAI> {
		const bluesAICoderAccountAuthToken = await this._authService.getAuthToken()
		if (!bluesAICoderAccountAuthToken) {
			throw new Error(BLUES_AI_CODER_ACCOUNT_AUTH_ERROR_MESSAGE)
		}
		if (!this.client) {
			try {
				this.client = new OpenAI({
					baseURL: `${this._baseUrl}/api/v1`,
					apiKey: bluesAICoderAccountAuthToken,
					defaultHeaders: {
						"HTTP-Referer": "https://blues-ai-coder.com",
						"X-Title": "Blues-AI Coder",
						"X-Task-ID": this.options.taskId || "",
						"X-Blues-AI-Coder-Version": extensionVersion,
					},
				})
			} catch (error: any) {
				throw new Error(`Error creating Blues-AI Coder client: ${error.message}`)
			}
		}
		// Ensure the client is always using the latest auth token
		this.client.apiKey = bluesAICoderAccountAuthToken
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		try {
			const client = await this.ensureClient()

			this.lastGenerationId = undefined

			let didOutputUsage: boolean = false

			const stream = await createOpenRouterStream(
				client,
				systemPrompt,
				messages,
				this.getModel(),
				this.options.reasoningEffort,
				this.options.thinkingBudgetTokens,
				this.options.openRouterProviderSorting,
			)

			for await (const chunk of stream) {
				// openrouter returns an error object instead of the openai sdk throwing an error
				if ("error" in chunk) {
					const error = chunk.error as OpenRouterErrorResponse["error"]
					console.error(`Blues-AI Coder API Error: ${error?.code} - ${error?.message}`)
					// Include metadata in the error message if available
					const metadataStr = error.metadata ? `\nMetadata: ${JSON.stringify(error.metadata, null, 2)}` : ""
					throw new Error(`Blues-AI Coder API Error ${error.code}: ${error.message}${metadataStr}`)
				}
				if (!this.lastGenerationId && chunk.id) {
					this.lastGenerationId = chunk.id
				}

				// Check for mid-stream error via finish_reason
				const choice = chunk.choices?.[0]
				// OpenRouter may return finish_reason = "error" with error details
				if ((choice?.finish_reason as string) === "error") {
					const choiceWithError = choice as any
					if (choiceWithError.error) {
						const error = choiceWithError.error
						console.error(`Blues-AI Coder Mid-Stream Error: ${error.code || error.type || "Unknown"} - ${error.message}`)
						throw new Error(`Blues-AI Coder Mid-Stream Error: ${error.code || error.type || "Unknown"} - ${error.message}`)
					} else {
						throw new Error(
							"Blues-AI Coder Mid-Stream Error: Stream terminated with error status but no error details provided",
						)
					}
				}

				const delta = choice?.delta
				if (delta?.content) {
					yield {
						type: "text",
						text: delta.content,
					}
				}

				// Reasoning tokens are returned separately from the content
				// Skip reasoning content for Grok 4 models since it only displays "thinking" without providing useful information
				if ("reasoning" in delta && delta.reasoning && !shouldSkipReasoningForModel(this.options.openRouterModelId)) {
					yield {
						type: "reasoning",
						// @ts-ignore-next-line
						reasoning: delta.reasoning,
					}
				}

				if (!didOutputUsage && chunk.usage) {
					// @ts-ignore-next-line
					let totalCost = (chunk.usage.cost || 0) + (chunk.usage.cost_details?.upstream_inference_cost || 0)
					const modelId = this.getModel().id

					// const provider = modelId.split("/")[0]
					// // If provider is x-ai, set totalCost to 0 (we're doing a promo)
					// if (provider === "x-ai") {
					// 	totalCost = 0
					// }

					if (modelId.includes("gemini")) {
						yield {
							type: "usage",
							cacheWriteTokens: 0,
							cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
							inputTokens:
								(chunk.usage.prompt_tokens || 0) - (chunk.usage.prompt_tokens_details?.cached_tokens || 0),
							outputTokens: chunk.usage.completion_tokens || 0,
							// @ts-ignore-next-line
							totalCost,
						}
					} else {
						yield {
							type: "usage",
							cacheWriteTokens: 0,
							cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
							inputTokens: chunk.usage.prompt_tokens || 0,
							outputTokens: chunk.usage.completion_tokens || 0,
							// @ts-ignore-next-line
							totalCost,
						}
					}
					didOutputUsage = true
				}
			}

			// Fallback to generation endpoint if usage chunk not returned
			if (!didOutputUsage) {
				console.warn("Blues-AI Coder API did not return usage chunk, fetching from generation endpoint")
				const apiStreamUsage = await this.getApiStreamUsage()
				if (apiStreamUsage) {
					yield apiStreamUsage
				}
			}
		} catch (error) {
			console.error("Blues-AI Coder API Error:", error)
			throw error
		}
	}

	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		if (this.lastGenerationId) {
			try {
				// TODO: replace this with firebase auth
				// TODO: use global API Host

				const response = await axios.get(`${this.bluesAICoderAccountService.baseUrl}/generation?id=${this.lastGenerationId}`, {
					headers: {
						Authorization: `Bearer ${this.options.bluesAiCoderAccountId}`,
					},
					timeout: 15_000, // this request hangs sometimes
				})

				const generation = response.data
				let modelId = this.options.openRouterModelId
				if (modelId && modelId.includes("gemini")) {
					return {
						type: "usage",
						cacheWriteTokens: 0,
						cacheReadTokens: generation?.native_tokens_cached || 0,
						// openrouter generation endpoint fails often
						inputTokens: (generation?.native_tokens_prompt || 0) - (generation?.native_tokens_cached || 0),
						outputTokens: generation?.native_tokens_completion || 0,
						totalCost: generation?.total_cost || 0,
					}
				} else {
					return {
						type: "usage",
						cacheWriteTokens: 0,
						cacheReadTokens: generation?.native_tokens_cached || 0,
						// openrouter generation endpoint fails often
						inputTokens: generation?.native_tokens_prompt || 0,
						outputTokens: generation?.native_tokens_completion || 0,
						totalCost: generation?.total_cost || 0,
					}
				}
			} catch (error) {
				// ignore if fails
				console.error("Error fetching Blues-AI Coder generation details:", error)
			}
		}
		return undefined
	}

	getModel(): { id: string; info: ModelInfo } {
		let modelId = this.options.openRouterModelId
		const modelInfo = this.options.openRouterModelInfo
		if (modelId && modelInfo) {
			return { id: modelId, info: modelInfo }
		}
		return { id: openRouterDefaultModelId, info: openRouterDefaultModelInfo }
	}
}
