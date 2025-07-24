import { memo } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { BluesAICoderMessage } from "@shared/ExtensionMessage"
import { BluesAICoderError, BluesAICoderErrorType } from "../../../../src/services/error/BluesAiCoderError"
import CreditLimitError from "@/components/chat/CreditLimitError"
import { useBluesAICoderAuth } from "@/context/BluesAICoderAuthContext"

const errorColor = "var(--vscode-errorForeground)"

interface ErrorRowProps {
	message: BluesAICoderMessage
	errorType:
		| "error"
		| "mistake_limit_reached"
		| "auto_approval_max_req_reached"
		| "diff_error"
		| "blues_ai_coder_ignore_error"
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
}

const ErrorRow = memo(({ message, errorType, apiRequestFailedMessage, apiReqStreamingFailedMessage }: ErrorRowProps) => {
	const { handleSignIn, bluesAiCoderUser } = useBluesAICoderAuth()

	const renderErrorContent = () => {
		switch (errorType) {
			case "error":
			case "mistake_limit_reached":
			case "auto_approval_max_req_reached":
				// Handle API request errors with special error parsing
				if (apiRequestFailedMessage || apiReqStreamingFailedMessage) {
					const bluesAiCoderError = BluesAICoderError.parse(apiRequestFailedMessage || apiReqStreamingFailedMessage)
					const bluesAiCoderErrorMessage = bluesAiCoderError?.message
					const requestId = bluesAiCoderError?._error?.request_id
					const isBluesAiCoderProvider = bluesAiCoderError?.providerId === "blues-ai-coder"

					if (bluesAiCoderError) {
						if (bluesAiCoderError.isErrorType(BluesAICoderErrorType.Balance)) {
							const errorDetails = bluesAiCoderError._error?.details
							return (
								<CreditLimitError
									currentBalance={errorDetails?.current_balance}
									totalSpent={errorDetails?.total_spent}
									totalPromotions={errorDetails?.total_promotions}
									message={errorDetails?.message}
									buyCreditsUrl={errorDetails?.buy_credits_url}
								/>
							)
						}
					}

					if (bluesAiCoderError?.isErrorType(BluesAICoderErrorType.RateLimit)) {
						return (
							<p className="m-0 whitespace-pre-wrap text-[var(--vscode-errorForeground)] wrap-anywhere">
								{bluesAiCoderErrorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</p>
						)
					}

					// Default error display
					return (
						<p className="m-0 whitespace-pre-wrap text-[var(--vscode-errorForeground)] wrap-anywhere">
							{bluesAiCoderErrorMessage}
							{requestId && <div>Request ID: {requestId}</div>}
							{bluesAiCoderErrorMessage?.toLowerCase()?.includes("powershell") && (
								<>
									<br />
									<br />
									It seems like you're having Windows PowerShell issues, please see this{" "}
									<a
										href="https://github.com/Blues-AI/blues-ai-coder/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22"
										className="underline text-inherit">
										troubleshooting guide
									</a>
									.
								</>
							)}
							{bluesAiCoderError?.isErrorType(BluesAICoderErrorType.Auth) && (
								<>
									<br />
									<br />
									{/* The user is signed in or not using blues-ai-coder provider */}
									{bluesAiCoderUser && !isBluesAiCoderProvider ? (
										<span className="mb-4 text-[var(--vscode-descriptionForeground)]">
											(Click "Retry" below)
										</span>
									) : (
										<VSCodeButton onClick={handleSignIn} className="w-full mb-4">
											Sign in to Blues-AI Coder
										</VSCodeButton>
									)}
								</>
							)}
						</p>
					)
				}

				// Regular error message
				return (
					<p className="m-0 whitespace-pre-wrap text-[var(--vscode-errorForeground)] wrap-anywhere">{message.text}</p>
				)

			case "diff_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs opacity-80 bg-[var(--vscode-textBlockQuote-background)] text-[var(--vscode-foreground)]">
						<div>The model used search patterns that don't match anything in the file. Retrying...</div>
					</div>
				)

			case "blues_ai_coder_ignore_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs bg-[var(--vscode-textBlockQuote-background)] text-[var(--vscode-foreground)] opacity-80">
						<div>
							Blues-AI Coder tried to access <code>{message.text}</code> which is blocked by the{" "}
							<code>.blues-ai-coder-ignore</code>
							file.
						</div>
					</div>
				)

			default:
				return null
		}
	}

	// For diff_error and blues_ai_coder_ignore_error, we don't show the header separately
	if (errorType === "diff_error" || errorType === "blues_ai_coder_ignore_error") {
		return <>{renderErrorContent()}</>
	}

	// For other error types, show header + content
	return <>{renderErrorContent()}</>
})

export default ErrorRow
