import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  Coffee,
  Utensils,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";

interface ScheduleSlot {
  time: string;
  duration: number;
  task_id?: string;
  title: string;
  type: "task" | "break" | "meal" | "buffer";
  priority: "urgent" | "high" | "medium" | "low" | "none";
}

interface TimetableProps {
  userId: string;
}

const Timetable = ({ userId }: TimetableProps) => {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const generateSchedule = async (date: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-timetable", {
        body: { date: date.toISOString() },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSchedule(data.schedule || []);
      toast.success("✨ Timetable generated!");
    } catch (error: any) {
      console.error("Error generating timetable:", error);
      toast.error("Failed to generate timetable");
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "break":
        return <Coffee className="w-4 h-4" />;
      case "meal":
        return <Utensils className="w-4 h-4" />;
      case "buffer":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string, priority: string) => {
    if (type === "break") return "bg-secondary/20 text-secondary border-secondary/30";
    if (type === "meal") return "bg-warning/20 text-warning border-warning/30";
    if (type === "buffer") return "bg-muted/20 text-muted-foreground border-muted/30";
    
    // Task colors by priority
    const colors = {
      urgent: "bg-destructive/20 text-destructive border-destructive/30",
      high: "bg-warning/20 text-warning border-warning/30",
      medium: "bg-primary/20 text-primary border-primary/30",
      low: "bg-muted/20 text-muted-foreground border-muted/30",
      none: "bg-muted/20 text-muted-foreground border-muted/30",
    };
    return colors[priority as keyof typeof colors];
  };

  const navigateDate = (days: number) => {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
    if (schedule.length > 0) {
      generateSchedule(newDate);
    }
  };

  return (
    <Card className="glass-strong p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">AI Timetable</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(-1)}
            disabled={loading}
            className="glass"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate(1)}
            disabled={loading}
            className="glass"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {schedule.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 glow-primary">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold mb-2">Generate Your Day</h4>
          <p className="text-sm text-muted-foreground mb-6">
            Let AI create an optimized schedule based on your tasks, priorities, and work patterns
          </p>
          <Button
            onClick={() => generateSchedule(selectedDate)}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 glow-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Timetable
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {schedule.filter((s) => s.type === "task").length} tasks scheduled
            </p>
            <Button
              onClick={() => generateSchedule(selectedDate)}
              disabled={loading}
              size="sm"
              variant="outline"
              className="glass"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className={`glass border-l-4 p-3 rounded-lg hover-lift animate-fade-in ${getTypeColor(
                  slot.type,
                  slot.priority
                )}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(slot.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold">
                          {slot.time}
                        </span>
                        <Badge variant="outline" className="text-xs py-0">
                          {slot.duration}min
                        </Badge>
                        {slot.type === "task" && (
                          <Badge variant="outline" className="text-xs py-0">
                            {slot.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{slot.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {slot.type}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {schedule.filter((s) => s.type === "task").length}
              </p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                {Math.round(
                  schedule
                    .filter((s) => s.type === "task")
                    .reduce((sum, s) => sum + s.duration, 0) / 60
                )}
                h
              </p>
              <p className="text-xs text-muted-foreground">Work Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {schedule.filter((s) => s.type === "break").length}
              </p>
              <p className="text-xs text-muted-foreground">Breaks</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Timetable;
