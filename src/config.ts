export enum Environment {
	production = "production",
	staging = "staging",
	local = "local",
}

interface EnvironmentConfig {
	appBaseUrl: string
	apiBaseUrl: string
	mcpBaseUrl: string
	firebase: {
		apiKey: string
		authDomain: string
		projectId: string
		storageBucket?: string
		messagingSenderId?: string
		appId?: string
	}
}

function getBluesAICoderEnv(): Environment {
	const _env = process?.env?.BLUES_AI_CODER_ENVIRONMENT
	if (_env && Object.values(Environment).includes(_env as Environment)) {
		return _env as Environment
	}
	return Environment.production
}

// Config getter function to avoid storing all configs in memory
function getEnvironmentConfig(env: Environment): EnvironmentConfig {
	switch (env) {
		case Environment.staging:
			return {
				appBaseUrl: "https://staging-app.blues-ai-coder.com",
				apiBaseUrl: "https://core-api.staging.int.blues-ai-coder.com",
				mcpBaseUrl: "https://api.blues-ai-coder.com/v1/mcp",
				firebase: {
					apiKey: "AIzaSyASSwkwX1kSO8vddjZkE5N19QU9cVQ0CIk",
					authDomain: "blues-ai-coder-staging.firebaseapp.com",
					projectId: "blues-ai-coder-staging",
					storageBucket: "blues-ai-coder-staging.firebasestorage.app",
					messagingSenderId: "853479478430",
					appId: "1:853479478430:web:2de0dba1c63c3262d4578f",
				},
			}
		case Environment.local:
			return {
				appBaseUrl: "http://localhost:3000",
				apiBaseUrl: "http://localhost:7777",
				mcpBaseUrl: "https://api.blues-ai-coder.com/v1/mcp",
				firebase: {
					apiKey: "AIzaSyD8wtkd1I-EICuAg6xgAQpRdwYTvwxZG2w",
					authDomain: "blues-ai-coder-preview.firebaseapp.com",
					projectId: "blues-ai-coder-preview",
				},
			}
		default:
			return {
				appBaseUrl: "https://app.blues-ai-coder.com",
				apiBaseUrl: "https://api.blues-ai-coder.com",
				mcpBaseUrl: "https://api.blues-ai-coder.com/v1/mcp",
				firebase: {
					apiKey: "AIzaSyC5rx59Xt8UgwdU3PCfzUF7vCwmp9-K2vk",
					authDomain: "blues-ai-coder-prod.firebaseapp.com",
					projectId: "blues-ai-coder-prod",
					storageBucket: "blues-ai-coder-prod.firebasestorage.app",
					messagingSenderId: "941048379330",
					appId: "1:941048379330:web:45058eedeefc5cdfcc485b",
				},
			}
	}
}

// Get environment once at module load
const BLUES_AI_CODER_ENVIRONMENT = getBluesAICoderEnv()
const _configCache = getEnvironmentConfig(BLUES_AI_CODER_ENVIRONMENT)

console.info("Blues AI Coder environment:", BLUES_AI_CODER_ENVIRONMENT)

export const bluesAICoderEnvConfig = _configCache
