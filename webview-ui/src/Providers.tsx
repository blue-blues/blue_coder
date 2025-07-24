import { type ReactNode } from "react"

import { ExtensionStateContextProvider } from "./context/ExtensionStateContext"
import { BluesAICoderAuthProvider } from "./context/BluesAICoderAuthContext"
import { HeroUIProvider } from "@heroui/react"
import { CustomPostHogProvider } from "./CustomPostHogProvider"

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ExtensionStateContextProvider>
			<CustomPostHogProvider>
				<BluesAICoderAuthProvider>
					<HeroUIProvider>{children}</HeroUIProvider>
				</BluesAICoderAuthProvider>
			</CustomPostHogProvider>
		</ExtensionStateContextProvider>
	)
}
