export const fileManipulationToolName = "FileManipulation";

export const fileManipulationToolDefinition = {
    name: fileManipulationToolName,
    description: "A tool for reading and writing files. Use this to view file contents or to create, update, or delete files.",
    inputSchema: {
        type: "object",
        properties: {
            operation: {
                type: "string",
                enum: ["read", "write", "delete"],
                description: "The operation to perform: 'read' to view a file, 'write' to create or update a file, or 'delete' to remove a file.",
            },
            path: {
                type: "string",
                description: "The path to the file.",
            },
            content: {
                type: "string",
                description: "The content to write to the file. Only required for the 'write' operation.",
            },
        },
        required: ["operation", "path"],
    },
};