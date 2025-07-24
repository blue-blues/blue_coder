import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useBluesAICoderAuth } from "@/context/BluesAICoderAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import { EmptyRequest } from "@shared/proto/common"

export const BluesAICoderAccountInfoCard = () => {
	const { bluesAiCoderUser } = useBluesAICoderAuth()
	const { apiConfiguration, navigateToAccount } = useExtensionState()

	let user = apiConfiguration?.bluesAiCoderAccountId ? bluesAiCoderUser : undefined

	const handleLogin = () => {
		AccountServiceClient.accountLoginClicked(EmptyRequest.create()).catch((err) =>
			console.error("Failed to get login URL:", err),
		)
	}

	const handleShowAccount = () => {
		navigateToAccount()
	}

	return (
		<div className="max-w-[600px]">
			{user ? (
				<VSCodeButton appearance="secondary" onClick={handleShowAccount}>
					View Billing & Usage
				</VSCodeButton>
			) : (
				<div>
					<VSCodeButton onClick={handleLogin} className="mt-0">
						Sign Up with Blues-AI Coder
					</VSCodeButton>
				</div>
			)}
		</div>
	)
}
