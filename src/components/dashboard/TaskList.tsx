import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit,
  ListTodo,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "archived";
  deadline: string | null;
  estimated_time: number | null;
  time_spent: number;
  created_at: string;
}

interface TaskListProps {
  userId: string;
}

const TaskList = ({ userId }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch tasks");
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: Task["status"]) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task deleted");
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    const colors = {
      low: "bg-muted text-muted-foreground",
      medium: "bg-secondary/20 text-secondary",
      high: "bg-warning/20 text-warning",
      urgent: "bg-destructive/20 text-destructive",
    };
    return colors[priority];
  };

  if (loading) {
    return (
      <Card className="glass-strong p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-strong p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <ListTodo className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Your Tasks</h3>
        <Badge variant="secondary" className="ml-auto">
          {tasks.length}
        </Badge>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No tasks yet</h4>
          <p className="text-muted-foreground text-sm">
            Create your first task to get started with FlowTime
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="glass p-4 rounded-lg hover-lift animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4
                      className={`font-medium ${
                        task.status === "completed"
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </h4>
                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                      {task.priority}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.deadline), "MMM d, yyyy")}
                      </div>
                    )}
                    {task.estimated_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_time}m
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTask(task.id)}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default TaskList;
