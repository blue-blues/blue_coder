import NewBluesAiCoderRuleRow from "./NewBluesAiCoderRuleRow"
import BluesAiCoderRuleRow from "./BluesAiCoderRuleRow"

const BluesAiCoderRulesToggleList = ({
	rules,
	toggleRule,
	listGap = "medium",
	isGlobal,
	ruleType,
	showNewRule,
	showNoRules,
}: {
	rules: [string, boolean][]
	toggleRule: (rulePath: string, enabled: boolean) => void
	listGap?: "small" | "medium" | "large"
	isGlobal: boolean
	ruleType: string
	showNewRule: boolean
	showNoRules: boolean
}) => {
	const gapClasses = {
		small: "gap-0",
		medium: "gap-2.5",
		large: "gap-5",
	}

	const gapClass = gapClasses[listGap]

	return (
		<div className={`flex flex-col ${gapClass}`}>
			{rules.length > 0 ? (
				<>
					{rules.map(([rulePath, enabled]) => (
						<BluesAiCoderRuleRow
							key={rulePath}
							rulePath={rulePath}
							enabled={enabled}
							isGlobal={isGlobal}
							toggleRule={toggleRule}
							ruleType={ruleType}
						/>
					))}
					{showNewRule && <NewBluesAiCoderRuleRow isGlobal={isGlobal} ruleType={ruleType} />}
				</>
			) : (
				<>
					{showNoRules && (
						<div className="flex flex-col items-center gap-3 my-3 text-[var(--vscode-descriptionForeground)]">
							{ruleType === "workflow" ? "No workflows found" : "No rules found"}
						</div>
					)}
					{showNewRule && <NewBluesAiCoderRuleRow isGlobal={isGlobal} ruleType={ruleType} />}
				</>
			)}
		</div>
	)
}

export default BluesAiCoderRulesToggleList
