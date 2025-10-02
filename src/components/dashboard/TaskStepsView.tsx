import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Circle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskStep {
  id: string;
  step_order: number;
  title: string;
  description: string;
  estimated_duration: number;
  completed: boolean;
  difficulty?: string;
  focus_type?: string;
}

interface TaskStepsViewProps {
  taskId: string;
  userId: string;
}

export default function TaskStepsView({ taskId, userId }: TaskStepsViewProps) {
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSteps();
  }, [taskId]);

  const fetchSteps = async () => {
    try {
      const { data, error } = await supabase
        .from('task_steps')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      setSteps(data || []);
    } catch (error) {
      console.error("Error fetching steps:", error);
      toast({
        title: "Error",
        description: "Failed to load task steps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (stepId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('task_steps')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', stepId);

      if (error) throw error;

      setSteps(steps.map(step => 
        step.id === stepId 
          ? { ...step, completed: !completed }
          : step
      ));

      toast({
        title: !completed ? "Step completed! 🎉" : "Step reopened",
        description: !completed ? "Great progress!" : "Step marked as incomplete",
      });
    } catch (error) {
      console.error("Error updating step:", error);
      toast({
        title: "Error",
        description: "Failed to update step",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'hard': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFocusIcon = (focusType?: string) => {
    switch (focusType) {
      case 'research': return '🔍';
      case 'creative': return '🎨';
      case 'analytical': return '📊';
      case 'execution': return '⚡';
      case 'review': return '✅';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading steps...</p>
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <p>No AI breakdown yet. Use "Analyze Task" when creating a task.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedSteps = steps.filter(s => s.completed).length;
  const totalTime = steps.reduce((acc, s) => acc + s.estimated_duration, 0);
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Task Breakdown
          </CardTitle>
          <Badge variant="outline" className="font-normal">
            {completedSteps}/{steps.length} steps • {totalTime}min total
          </Badge>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{progressPercentage}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`border rounded-lg p-4 transition-all ${
              step.completed ? 'bg-muted/50 opacity-75' : 'bg-card'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={step.completed}
                onCheckedChange={() => toggleStep(step.id, step.completed)}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      Step {step.step_order}: {step.title}
                    </span>
                  </div>
                  <span className="text-xs">{getFocusIcon(step.focus_type)}</span>
                </div>
                <p className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {step.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-normal">
                    <Clock className="h-3 w-3 mr-1" />
                    {step.estimated_duration} min
                  </Badge>
                  {step.difficulty && (
                    <Badge className={`text-xs font-normal ${getDifficultyColor(step.difficulty)}`}>
                      {step.difficulty}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
