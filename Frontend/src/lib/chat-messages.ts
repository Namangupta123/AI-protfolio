const NAME = process.env.NEXT_PUBLIC_NAME;

// Fixed replies that are not real answers. Shared by the API route (server) and
// the chat page (client) so follow-up suggestions can be skipped for them.
export const BLOCKED_MESSAGE =
  "I'm " +
  NAME +
  "'s professional portfolio assistant. I can only answer questions about his skills, experience, and projects. Please keep your question on topic.";

export const NO_CONTEXT_MESSAGE = "No relevant context found in knowledge base.";
