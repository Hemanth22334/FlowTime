import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const AddTaskDialog = ({ open, onOpenChange, userId }: AddTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    deadline: "",
    estimated_time: "",
    is_recurring: false,
    recurrence_pattern: "daily",
    recurrence_interval: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: userId,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        recurrence_interval: formData.is_recurring ? parseInt(formData.recurrence_interval) : null,
      });

      if (error) throw error;

      toast.success("Task created successfully!");
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        deadline: "",
        estimated_time: "",
        is_recurring: false,
        recurrence_pattern: "daily",
        recurrence_interval: "1",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="gradient-text">Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about this task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_time">Time (minutes)</Label>
            <Input
              id="estimated_time"
              type="number"
              placeholder="30"
              value={formData.estimated_time}
              onChange={(e) =>
                setFormData({ ...formData, estimated_time: e.target.value })
              }
              className="glass"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="glass"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_recurring">Recurring Task</Label>
            <div className="flex items-center gap-2">
              <input
                id="is_recurring"
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) =>
                  setFormData({ ...formData, is_recurring: e.target.checked })
                }
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Make this a recurring task
              </Label>
            </div>
          </div>

          {formData.is_recurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recurrence_pattern">Repeat</Label>
                <Select
                  value={formData.recurrence_pattern}
                  onValueChange={(value) =>
                    setFormData({ ...formData, recurrence_pattern: value })
                  }
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence_interval">Every</Label>
                <Input
                  id="recurrence_interval"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.recurrence_interval}
                  onChange={(e) =>
                    setFormData({ ...formData, recurrence_interval: e.target.value })
                  }
                  className="glass"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.recurrence_pattern === "daily" && "day(s)"}
                  {formData.recurrence_pattern === "weekly" && "week(s)"}
                  {formData.recurrence_pattern === "monthly" && "month(s)"}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 glass"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 glow-primary"
            >
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
