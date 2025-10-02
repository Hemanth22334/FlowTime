import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface Task {
  id: string;
  title: string;
  deadline: string | null;
  priority: string;
  status: string;
}

interface CalendarViewProps {
  userId: string;
}

const CalendarView = ({ userId }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [userId, currentMonth]);

  const fetchTasks = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data } = await supabase
      .from("tasks")
      .select("id, title, deadline, priority, status")
      .eq("user_id", userId)
      .gte("deadline", start.toISOString())
      .lte("deadline", end.toISOString())
      .order("deadline");

    setTasks(data || []);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => task.deadline && isSameDay(new Date(task.deadline), day));
  };

  const getPriorityDot = (priority: string) => {
    const colors = {
      urgent: "bg-destructive",
      high: "bg-warning",
      medium: "bg-secondary",
      low: "bg-muted-foreground",
    };
    return colors[priority as keyof typeof colors] || "bg-muted";
  };

  const dayTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <Card className="glass-strong p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="glass"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="glass"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day)}
              className={`
                aspect-square p-1 rounded-lg text-sm transition-all hover-lift relative
                ${!isCurrentMonth ? "text-muted-foreground/30" : ""}
                ${isToday ? "bg-primary/20 ring-2 ring-primary" : ""}
                ${isSelected ? "bg-primary/10" : "glass"}
              `}
            >
              <div className="font-medium">{format(day, "d")}</div>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`w-1 h-1 rounded-full ${getPriorityDot(task.priority)}`}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Tasks */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h4 className="text-sm font-semibold mb-3">
            {format(selectedDate, "EEEE, MMMM d")}
          </h4>
          {dayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks scheduled</p>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((task) => (
                <div key={task.id} className="glass p-2 rounded-lg flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`} />
                  <span className="text-sm flex-1">{task.title}</span>
                  <Badge
                    variant="outline"
                    className={
                      task.status === "completed"
                        ? "bg-success/20 text-success"
                        : "bg-muted"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CalendarView;
