import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import ErrorRow from "./ErrorRow"
import { BluesAICoderMessage } from "@shared/ExtensionMessage"

// Mock the auth context
const mockHandleSignIn = vi.fn()
vi.mock("@/context/BluesAiCoderAuthContext", () => ({
	useBluesAiCoderAuth: () => ({
		handleSignIn: mockHandleSignIn,
		bluesAiCoderUser: null,
	}),
}))

// Mock CreditLimitError component
vi.mock("@/components/chat/CreditLimitError", () => ({
	default: ({ message }: { message: string }) => <div data-testid="credit-limit-error">{message}</div>,
}))

// Mock BluesAiCoderError
vi.mock("../../../../src/services/error/BluesAiCoderError", () => ({
	BluesAICoderError: {
		parse: vi.fn(),
	},
	BluesAICoderErrorType: {
		Balance: "balance",
		RateLimit: "rateLimit",
		Auth: "auth",
	},
}))

describe("ErrorRow", () => {
	const mockMessage: BluesAICoderMessage = {
		ts: 123456789,
		type: "say",
		say: "error",
		text: "Test error message",
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders basic error message", () => {
		render(<ErrorRow message={mockMessage} errorType="error" />)

		expect(screen.getByText("Test error message")).toBeInTheDocument()
	})

	it("renders mistake limit reached error", () => {
		const mistakeMessage = { ...mockMessage, text: "Mistake limit reached" }
		render(<ErrorRow message={mistakeMessage} errorType="mistake_limit_reached" />)

		expect(screen.getByText("Mistake limit reached")).toBeInTheDocument()
	})

	it("renders auto approval max requests error", () => {
		const maxReqMessage = { ...mockMessage, text: "Max requests reached" }
		render(<ErrorRow message={maxReqMessage} errorType="auto_approval_max_req_reached" />)

		expect(screen.getByText("Max requests reached")).toBeInTheDocument()
	})

	it("renders diff error", () => {
		render(<ErrorRow message={mockMessage} errorType="diff_error" />)

		expect(
			screen.getByText("The model used search patterns that don't match anything in the file. Retrying..."),
		).toBeInTheDocument()
	})

	it("renders blues_ai_coder_ignore error", () => {
		const bluesAiCoderIgnoreMessage = { ...mockMessage, text: "/path/to/file.txt" }
		render(<ErrorRow message={bluesAiCoderIgnoreMessage} errorType="blues_ai_coder_ignore_error" />)

		expect(screen.getByText(/Blues-AI Coder tried to access/)).toBeInTheDocument()
		expect(screen.getByText("/path/to/file.txt")).toBeInTheDocument()
	})

	describe("API error handling", () => {
		it("renders credit limit error when balance error is detected", async () => {
			const mockBluesAiCoderError = {
				message: "Insufficient credits",
				isErrorType: vi.fn((type) => type === "balance"),
				_error: {
					details: {
						current_balance: 0,
						total_spent: 10.5,
						total_promotions: 5.0,
						message: "You have run out of credit.",
						buy_credits_url: "https://app.blues-ai-coder.com/dashboard",
					},
				},
			}

			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(mockBluesAiCoderError as any)

			render(<ErrorRow message={mockMessage} errorType="error" apiRequestFailedMessage="Insufficient credits error" />)

			expect(screen.getByTestId("credit-limit-error")).toBeInTheDocument()
			expect(screen.getByText("You have run out of credit.")).toBeInTheDocument()
		})

		it("renders rate limit error with request ID", async () => {
			const mockBluesAiCoderError = {
				message: "Rate limit exceeded",
				isErrorType: vi.fn((type) => type === "rateLimit"),
				_error: {
					request_id: "req_123456",
				},
			}

			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(mockBluesAiCoderError as any)

			render(<ErrorRow message={mockMessage} errorType="error" apiRequestFailedMessage="Rate limit exceeded" />)

			expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument()
			expect(screen.getByText("Request ID: req_123456")).toBeInTheDocument()
		})

		it("renders auth error with sign in button when user is not signed in", async () => {
			const mockBluesAiCoderError = {
				message: "Authentication failed",
				isErrorType: vi.fn((type) => type === "auth"),
				providerId: "blues-ai-coder",
				_error: {},
			}

			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(mockBluesAiCoderError as any)

			render(<ErrorRow message={mockMessage} errorType="error" apiRequestFailedMessage="Authentication failed" />)

			expect(screen.getByText("Authentication failed")).toBeInTheDocument()
			expect(screen.getByText("Sign in to Blues-AI Coder")).toBeInTheDocument()
		})

		it("renders PowerShell troubleshooting link when error mentions PowerShell", async () => {
			const mockBluesAiCoderError = {
				message: "PowerShell is not recognized as an internal or external command",
				isErrorType: vi.fn(() => false),
				_error: {},
			}

			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(mockBluesAiCoderError as any)

			render(
				<ErrorRow
					message={mockMessage}
					errorType="error"
					apiRequestFailedMessage="PowerShell is not recognized as an internal or external command"
				/>,
			)

			expect(screen.getByText(/PowerShell is not recognized/)).toBeInTheDocument()
			expect(screen.getByText("troubleshooting guide")).toBeInTheDocument()
			expect(screen.getByRole("link", { name: "troubleshooting guide" })).toHaveAttribute(
				"href",
				"https://github.com/Exaf-AI/blues-ai-coder/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22",
			)
		})

		it("handles apiReqStreamingFailedMessage instead of apiRequestFailedMessage", async () => {
			const mockBluesAiCoderError = {
				message: "Streaming failed",
				isErrorType: vi.fn(() => false),
				_error: {},
			}

			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(mockBluesAiCoderError as any)

			render(<ErrorRow message={mockMessage} errorType="error" apiReqStreamingFailedMessage="Streaming failed" />)

			expect(screen.getByText("Streaming failed")).toBeInTheDocument()
		})

		it("falls back to regular error message when BluesAiCoderError.parse returns null", async () => {
			const { BluesAICoderError } = await import("../../../../src/services/error/BluesAiCoderError")
			vi.mocked(BluesAICoderError.parse).mockReturnValue(undefined)

			render(<ErrorRow message={mockMessage} errorType="error" apiRequestFailedMessage="Some API error" />)

			// When BluesAiCoderError.parse returns null, bluesAiCoderErrorMessage is undefined, so it renders an empty paragraph
			// The fallback to message.text only happens when there's no apiRequestFailedMessage at all
			const paragraph = screen.getByRole("paragraph")
			expect(paragraph).toBeInTheDocument()
			expect(paragraph).toBeEmptyDOMElement()
		})

		it("renders regular error message when no API error messages are provided", () => {
			render(<ErrorRow message={mockMessage} errorType="error" />)

			expect(screen.getByText("Test error message")).toBeInTheDocument()
		})
	})
})
