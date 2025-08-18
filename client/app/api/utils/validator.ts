import { z } from "zod";


export const myListScheme = z.object({
    config: z.object({
        addText: z.string(),
        template: z.string(),
        title: z.string(),
        key: z.string(),
        type: z.string().optional()
    }),
    name: z.string(),
});

export const profileFormSchema = z.object({
    name: z
        .string()
        .min(1, {
            message: "Name must be at least 1 characters.",
        }),
    temperature: z.string().default("0.2"),
    topP: z.string().default("0.95"),
    maxTokens: z.string().default("800"),
    frequencyPenalty: z.string().default("0"),
    presencePenalty: z.string().default("0"),
    modelName: z.string().default("GPT-4o"),
    title: z
        .string()
        .min(1, {
            message: "Title must be at least 1 characters.",
        }),
    src: z
        .string()
        .optional(),
    description: z
        .string()
        .optional(),
    instructionDescription: z
        .string()
        .min(1, {
            message: "Title must be at least 1 characters.",
        }),
    introduction: z.array(z.object({
        type: z.string().min(1, "Type is required"),
        value: z.string().min(1, "Value is required"),
    })),
    instructions: z.array(z.object({
        title: z.string().min(1, "Title is required"),
        value: z.string().min(1, "Value is required"),
        starter: z.string().min(1, "Starter is required")
    })),
    additionalConsideration: z.array(z.object({
        title: z.string().min(1, "Title is required"),
        value: z.string().min(1, "Value is required"),
        starter: z.string().min(1, "Starter is required")
    })),
    assistantTemplate: z.array(z.object({
        title: z.string(),
        type: z.string(),
        value: z.array(z.any()),
        key: z.string()
    })),
    extra: z.record(z.any()).optional(),
    messageOptions: z.array(z.any()).optional()
})


export const contextScopeForm = z.object({
    title: z
        .string()
        .min(1, {
            message: "Name must be at least 1 characters.",
        }),
    content: z
        .string()
        .min(1, {
            message: "Title must be at least 1 characters.",
        }),
    assignedAssistantIds: z.array(z.string()),
    prompt: z
        .string(),
    contextType: z.string().min(1, { message: "Group Type must be at least 1 characters" })
})

export const assistantGroupForm = z.object({
    name: z
        .string()
        .min(1, {
            message: "Name must be at least 1 characters.",
        }),
    title: z
        .string()
        .min(1, {
            message: "Title must be at least 1 characters.",
        }),
    iconUrl: z.string().min(1, {
        message: "Title must be at least 1 characters.",
    }),
    relatedAssistants: z.array(z.string()).min(1),
    selectedMessage: z
        .string()
        .min(1, {
            message: "Title must be at least 1 characters.",
        }),
    groupType: z.string().min(1, { message: "Group Type must be at least 1 characters" })
})