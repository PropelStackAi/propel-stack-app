import { PagePlaceholder } from '../components/PagePlaceholder';

export function AIAssistant() {
  return (
    <PagePlaceholder
      title="AI Assistant"
      sessionNumber={4}
      description="Persistent AI chat with streaming responses, conversation history, model selector, mode selector, file attachments, and per-plan token budget enforcement. All calls route through the server AI gateway."
      accent="coral"
    />
  );
}
