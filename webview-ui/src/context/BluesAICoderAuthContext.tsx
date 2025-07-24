import { AccountServiceClient } from "@/services/grpc-client"
import { EmptyRequest } from "@shared/proto/common"
import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

// Define User type (you may need to adjust this based on your actual User type)
export interface BluesAICoderUser {
	uid: string
	email?: string
	displayName?: string
	photoUrl?: string
	appBaseUrl?: string
}

export interface BluesAICoderAuthContextType {
	bluesAiCoderUser: BluesAICoderUser | null
	handleSignIn: () => Promise<void>
	handleSignOut: () => Promise<void>
}

const BluesAICoderAuthContext = createContext<BluesAICoderAuthContextType | undefined>(undefined)

export const BluesAICoderAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<BluesAICoderUser | null>(null)

	useEffect(() => {
		console.log("Extension: BluesAICoderAuthContext: user updated:", user)
	}, [user])

	// Handle auth status update events
	useEffect(() => {
		const cancelSubscription = AccountServiceClient.subscribeToAuthStatusUpdate(EmptyRequest.create(), {
			onResponse: async (response: any) => {
				console.log("Extension: BluesAICoderAuthContext: Received auth status update:", response)
				if (response) {
					if (response.user) {
						setUser(response.user)
					} else {
						setUser(null)
					}
				}
			},
			onError: (error: Error) => {
				console.error("Error in auth callback subscription:", error)
			},
			onComplete: () => {
				console.log("Auth callback subscription completed")
			},
		})

		// Cleanup function to cancel subscription when component unmounts
		return () => {
			cancelSubscription()
		}
	}, [])

	const handleSignIn = useCallback(async () => {
		try {
			AccountServiceClient.accountLoginClicked(EmptyRequest.create()).catch((err) =>
				console.error("Failed to get login URL:", err),
			)
		} catch (error) {
			console.error("Error signing in:", error)
			throw error
		}
	}, [])

	const handleSignOut = useCallback(async () => {
		try {
			await AccountServiceClient.accountLogoutClicked(EmptyRequest.create()).catch((err) =>
				console.error("Failed to logout:", err),
			)
		} catch (error) {
			console.error("Error signing out:", error)
			throw error
		}
	}, [])

	return (
		<BluesAICoderAuthContext.Provider value={{ bluesAiCoderUser: user, handleSignIn, handleSignOut }}>{children}</BluesAICoderAuthContext.Provider>
	)
}

export const useBluesAICoderAuth = () => {
	const context = useContext(BluesAICoderAuthContext)
	if (context === undefined) {
		throw new Error("useBluesAICoderAuth must be used within a BluesAICoderAuthProvider")
	}
	return context
}
