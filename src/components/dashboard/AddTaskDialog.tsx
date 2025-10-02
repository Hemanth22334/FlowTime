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
import { Brain, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface TaskStep {
  step_order: number;
  title: string;
  description: string;
  estimated_duration: number;
  difficulty: string;
  focus_type: string;
  dependencies: number[];
}

interface TaskAnalysis {
  analysis: {
    core_objective: string;
    complexity_level: string;
    key_challenges: string[];
  };
  steps: TaskStep[];
  total_estimated_time: number;
  recommended_approach: string;
}

const AddTaskDialog = ({ open, onOpenChange, userId }: AddTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<TaskAnalysis | null>(null);
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

  const handleAnalyze = async () => {
    if (!formData.title) {
      toast.error("Please enter a task title first");
      return;
    }

    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
          deadline: formData.deadline,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const analysis = await response.json();
      setAiAnalysis(analysis);
      
      // Auto-fill estimated time if not set
      if (!formData.estimated_time && analysis.total_estimated_time) {
        setFormData({ ...formData, estimated_time: analysis.total_estimated_time.toString() });
      }

      toast.success("Task analyzed successfully! ✨", {
        description: `${analysis.steps.length} steps generated`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze task");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_interval: formData.is_recurring ? parseInt(formData.recurrence_interval) : null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If we have AI analysis, insert the steps
      if (aiAnalysis && aiAnalysis.steps.length > 0) {
        const stepsToInsert = aiAnalysis.steps.map(step => ({
          task_id: taskData.id,
          user_id: userId,
          step_order: step.step_order,
          title: step.title,
          description: step.description,
          estimated_duration: step.estimated_duration,
          dependencies: (step.dependencies || []).map(d => d.toString()),
          completed: false,
        }));

        const { error: stepsError } = await supabase
          .from("task_steps")
          .insert(stepsToInsert);

        if (stepsError) {
          console.error("Error inserting steps:", stepsError);
          toast.error("Task created but steps failed to save");
        } else {
          toast.success("Task created with AI breakdown! 🎉", {
            description: `${aiAnalysis.steps.length} steps added`,
          });
        }
      } else {
        toast.success("Task created successfully!");
      }

      // Reset form
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
      setAiAnalysis(null);
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

          <div className="space-y-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAnalyze}
              disabled={analyzing || !formData.title}
              className="w-full glass"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze Task & Generate Steps
                </>
              )}
            </Button>

            {aiAnalysis && (
              <Card className="glass-strong">
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Analysis
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {aiAnalysis.analysis.core_objective}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        {aiAnalysis.analysis.complexity_level} complexity
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {aiAnalysis.total_estimated_time} min total
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {aiAnalysis.steps.length} Steps Generated
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {aiAnalysis.steps.map((step) => (
                        <div key={step.step_order} className="text-xs p-2 bg-background/50 rounded">
                          <div className="font-medium">
                            {step.step_order}. {step.title}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            {step.estimated_duration}min
                            <Badge className="text-xs" variant="outline">
                              {step.focus_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    💡 {aiAnalysis.recommended_approach}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAiAnalysis(null);
                  onOpenChange(false);
                }}
                className="flex-1 glass"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90 glow-primary"
              >
                {loading ? "Creating..." : aiAnalysis ? "Create with Steps" : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
