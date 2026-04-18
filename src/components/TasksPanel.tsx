import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

export const TasksPanel = ({ refreshKey }: { refreshKey: number }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) toast({ variant: "destructive", title: "Failed to load tasks" });
    else setTasks((data ?? []) as Task[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const toggle = async (t: Task) => {
    const next = t.status === "done" ? "pending" : "done";
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  };

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  }

  if (!tasks.length) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No tasks yet. Ask Aether to create one.</p>
      </div>
    );
  }

  const priorityColor = (p: string) =>
    p === "high" ? "bg-destructive/15 text-destructive" :
    p === "low"  ? "bg-muted text-muted-foreground" :
                   "bg-primary/15 text-primary";

  return (
    <div className="space-y-2 px-3 pb-3">
      {tasks.map((t) => (
        <div key={t.id} className="group bg-secondary/40 hover:bg-secondary rounded-xl p-3 transition border border-transparent hover:border-border">
          <div className="flex items-start gap-2">
            <button onClick={() => toggle(t)} className="mt-0.5 shrink-0">
              {t.status === "done"
                ? <CheckCircle2 className="w-5 h-5 text-primary" />
                : <Circle className="w-5 h-5 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </div>
              {t.description && (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor(t.priority)}`}>
                  {t.priority}
                </span>
                {t.due_date && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 h-7 w-7">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
