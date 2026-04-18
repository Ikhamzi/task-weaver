import ReactMarkdown from "react-markdown";
import { Sparkles, User, Wrench, CheckCircle2, XCircle } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: any;
  created_at?: string;
  pending?: boolean;
}

const toolLabel: Record<string, string> = {
  create_task: "Created task",
  list_tasks: "Listed tasks",
  update_task: "Updated task",
  delete_task: "Deleted task",
  create_event: "Scheduled event",
  list_events: "Listed events",
  send_email: "Sent email",
  web_search: "Searched the web",
};

const ToolBadge = ({ event }: { event: any }) => {
  const ok = event.result?.ok;
  return (
    <div className="flex items-center gap-2 text-xs bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5">
      <Wrench className="w-3 h-3 text-primary" />
      <span className="font-medium">{toolLabel[event.tool] ?? event.tool}</span>
      {ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-destructive" />}
      {event.args?.title && <span className="text-muted-foreground truncate max-w-[180px]">· {event.args.title}</span>}
      {event.args?.query && <span className="text-muted-foreground truncate max-w-[180px]">· "{event.args.query}"</span>}
      {event.args?.to && <span className="text-muted-foreground truncate max-w-[180px]">· {event.args.to}</span>}
    </div>
  );
};

export const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser ? "bg-secondary" : "bg-gradient-primary glow"
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-foreground" />
          : <Sparkles className="w-4 h-4 text-primary-foreground" />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.tool_calls.map((e: any, i: number) => <ToolBadge key={i} event={e} />)}
          </div>
        )}

        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        }`}>
          {msg.pending ? (
            <span className="dot-typing"><span /><span /><span /></span>
          ) : isUser ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0">
              <ReactMarkdown>{msg.content || ""}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
