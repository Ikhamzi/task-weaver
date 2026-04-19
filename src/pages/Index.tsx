import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Send, LogOut, ListChecks, CalendarClock, Plus, Loader2, PanelRight } from "lucide-react";
import { ChatBubble, ChatMessage } from "@/components/ChatBubble";
import { TasksPanel } from "@/components/TasksPanel";
import { EventsPanel } from "@/components/EventsPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const SUGGESTIONS = [
  "Plan a weekend trip to Goa under ₹10,000 and email me the itinerary",
  "Add a task to finish my project report tomorrow at 5pm",
  "Schedule a 30-min standup tomorrow at 10am",
  "Search for the latest news on AI agents",
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("tasks");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Get or create active conversation
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        setConversationId(existing.id);
      } else {
        const { data: created } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: "New conversation" })
          .select("id")
          .single();
        if (created) setConversationId(created.id);
      }
    })();
  }, [user]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    })();
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const newConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New conversation" })
      .select("id")
      .single();
    if (data) {
      setConversationId(data.id);
      setMessages([]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setInput("");
    setSending(true);

    const tempUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
    };
    const tempAssistant: ChatMessage = {
      id: `tmp-a-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((m) => [...m, tempUser, tempAssistant]);

    try {
      const { data, error } = await supabase.functions.invoke("agent-run", {
        body: { conversationId, message: text },
      });
      if (error) throw error;

      // Reload messages from DB to get real records & tool_calls
      const { data: fresh } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((fresh ?? []) as ChatMessage[]);
      setPanelKey((k) => k + 1);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Agent error",
        description: err?.message ?? "Something went wrong.",
      });
      setMessages((m) => m.filter((msg) => !msg.pending && !msg.id.startsWith("tmp-")));
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-md bg-background/60 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center glow">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold leading-none">Aether</div>
            <div className="text-[10px] text-muted-foreground">AI Task Agent</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={newConversation}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </Button>
          <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] overflow-hidden">
        {/* Chat */}
        <main className="flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center glow mb-4">
                  <Sparkles className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  Hi, I'm <span className="text-gradient">Aether</span>
                </h1>
                <p className="text-muted-foreground mb-8">
                  Tell me what you want done. I'll plan it, schedule it, and execute it using my tools.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 w-full">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-left text-sm bg-card hover:bg-secondary border border-border rounded-xl p-3 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => <ChatBubble key={m.id} msg={m} />)
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 bg-background/60 backdrop-blur-md p-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/50 transition">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Ask Aether to do something… (Shift+Enter for newline)"
                  rows={1}
                  className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 min-h-[40px] max-h-40 py-2"
                />
                <Button onClick={send} disabled={sending || !input.trim()} variant="hero" size="icon" className="h-10 w-10 shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Aether can create tasks, schedule events, send emails and search the web.
              </p>
            </div>
          </div>
        </main>

        {/* Side panel */}
        <aside className="hidden lg:flex flex-col border-l border-border/60 bg-card/30 overflow-hidden">
          <div className="flex border-b border-border/60">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                activeTab === "tasks" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              <ListChecks className="w-4 h-4" /> Tasks
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                activeTab === "events" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              <CalendarClock className="w-4 h-4" /> Schedule
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-3">
            {activeTab === "tasks"
              ? <TasksPanel refreshKey={panelKey} />
              : <EventsPanel refreshKey={panelKey} />}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
