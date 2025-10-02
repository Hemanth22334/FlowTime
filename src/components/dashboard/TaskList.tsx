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
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

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

  const togglePriorityFilter = (priority: string) => {
    const newFilters = new Set(filterPriorities);
    if (newFilters.has(priority)) {
      newFilters.delete(priority);
    } else {
      newFilters.add(priority);
    }
    setFilterPriorities(newFilters);
  };

  const toggleStatusFilter = (status: string) => {
    const newFilters = new Set(filterStatuses);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setFilterStatuses(newFilters);
  };

  const filteredTasks = tasks.filter((task) => {
    // Priority filter
    if (filterPriorities.size > 0 && !filterPriorities.has(task.priority)) {
      return false;
    }
    
    // Status filter
    if (filterStatuses.size > 0 && !filterStatuses.has(task.status)) {
      return false;
    }
    
    // Overdue filter
    if (showOverdueOnly) {
      if (!task.deadline) return false;
      const isOverdue = new Date(task.deadline) < new Date() && task.status !== "completed";
      if (!isOverdue) return false;
    }
    
    return true;
  });

  const activeFiltersCount = filterPriorities.size + filterStatuses.size + (showOverdueOnly ? 1 : 0);

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
          {filteredTasks.length} / {tasks.length}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="glass relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-56">
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filterPriorities.has("urgent")}
              onCheckedChange={() => togglePriorityFilter("urgent")}
            >
              <Badge className="bg-destructive/20 text-destructive mr-2" variant="outline">
                urgent
              </Badge>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriorities.has("high")}
              onCheckedChange={() => togglePriorityFilter("high")}
            >
              <Badge className="bg-warning/20 text-warning mr-2" variant="outline">
                high
              </Badge>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriorities.has("medium")}
              onCheckedChange={() => togglePriorityFilter("medium")}
            >
              <Badge className="bg-secondary/20 text-secondary mr-2" variant="outline">
                medium
              </Badge>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterPriorities.has("low")}
              onCheckedChange={() => togglePriorityFilter("low")}
            >
              <Badge className="bg-muted text-muted-foreground mr-2" variant="outline">
                low
              </Badge>
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filterStatuses.has("pending")}
              onCheckedChange={() => toggleStatusFilter("pending")}
            >
              Pending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatuses.has("in_progress")}
              onCheckedChange={() => toggleStatusFilter("in_progress")}
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatuses.has("completed")}
              onCheckedChange={() => toggleStatusFilter("completed")}
            >
              Completed
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuCheckboxItem
              checked={showOverdueOnly}
              onCheckedChange={setShowOverdueOnly}
            >
              Show Overdue Only
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold mb-2">
            {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
          </h4>
          <p className="text-muted-foreground text-sm">
            {tasks.length === 0 
              ? "Create your first task to get started with FlowTime"
              : "Try adjusting your filters to see more tasks"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
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
