import { MessageStateHandler } from "@core/task/message-state";
import { ToolExecutor } from "@core/task/ToolExecutor";
import { TaskState } from "@core/task/TaskState";
import { fileManipulationToolName } from "@core/tools/fileManipulationTool";

export class SequentialAgent {
    constructor(
        private toolExecutor: ToolExecutor,
        private taskState: TaskState,
        private messageStateHandler: MessageStateHandler,
    ) {}

    public async run() {
        const initialMessage = this.messageStateHandler.getBluesAICoderMessages()[0];
        if (!initialMessage || !initialMessage.text) {
            console.error("Could not find initial message to start sequential agent.");
            return;
        }

        const userPrompt = `<task>\n${initialMessage.text}\n</task>`

        // Use a system prompt that encourages a sequence of tool calls
        const systemPrompt = "You are an AI assistant that completes tasks by generating a sequence of tool calls. Respond with a series of tool_use blocks."

        const response = await this.toolExecutor.api.createMessage(systemPrompt, [
            {
                role: "user",
                content: [{ type: "text", text: userPrompt }],
            },
        ]);

        let fullResponse = ""
        for await (const chunk of response) {
            if (chunk.type === "text") {
                fullResponse += chunk.text
            }
        }

        const toolCalls = this.extractToolCalls(fullResponse);

        for (const toolCall of toolCalls) {
            if (this.taskState.abort || this.taskState.didRejectTool) {
                break;
            }
            await this.toolExecutor.executeTool(toolCall);
        }
    }

    private extractToolCalls(response: string): any[] {
        const toolCallRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
        const matches = response.matchAll(toolCallRegex);
        const toolCalls = [];

        for (const match of matches) {
            const toolCallContent = match[1].trim();
            // This is a simplified parser. A more robust solution would handle XML parsing properly.
            const toolNameMatch = toolCallContent.match(/<tool_name>([^<]+)<\/tool_name>/);
            const parametersMatch = toolCallContent.match(/<parameters>([\s\S]*?)<\/parameters>/);

            if (toolNameMatch && parametersMatch) {
                const toolName = toolNameMatch[1].trim();
                const parametersXml = parametersMatch[1].trim();
                const params = this.parseParameters(parametersXml);

                toolCalls.push({
                    type: "tool_use",
                    name: toolName,
                    params: params,
                });
            }
        }

        return toolCalls;
    }

    private parseParameters(xml: string): Record<string, any> {
        const params: Record<string, any> = {};
        const paramRegex = /<([^>]+)>([^<]*)<\/\1>/g;
        let match;
        while ((match = paramRegex.exec(xml)) !== null) {
            params[match[1]] = match[2];
        }
        return params;
    }
}