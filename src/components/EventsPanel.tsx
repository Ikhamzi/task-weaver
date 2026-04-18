import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, MapPin, Loader2 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
}

export const EventsPanel = ({ refreshKey }: { refreshKey: number }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", new Date(Date.now() - 86400000).toISOString())
        .order("start_time", { ascending: true })
        .limit(15);
      setEvents((data ?? []) as Event[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  if (!events.length) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      {events.map((e) => (
        <div key={e.id} className="bg-secondary/40 rounded-xl p-3 border border-transparent hover:border-border transition">
          <div className="flex items-start gap-2">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-accent flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{e.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(e.start_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </div>
              {e.location && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {e.location}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
