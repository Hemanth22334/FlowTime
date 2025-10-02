import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskSuggestion {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimated_time: number;
}

interface AISuggestionsProps {
  userId: string;
}

const AISuggestions = ({ userId }: AISuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState<string | null>(null);

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-task-suggestions", {
        body: {},
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data.suggestions || []);
      toast.success("✨ AI suggestions generated!");
    } catch (error: any) {
      console.error("Error getting suggestions:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  const addTaskFromSuggestion = async (suggestion: TaskSuggestion) => {
    setAddingTask(suggestion.title);
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: userId,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        estimated_time: suggestion.estimated_time,
      });

      if (error) throw error;

      toast.success("Task added!");
      setSuggestions(suggestions.filter((s) => s.title !== suggestion.title));
    } catch (error: any) {
      toast.error("Failed to add task");
    } finally {
      setAddingTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-muted text-muted-foreground",
      medium: "bg-secondary/20 text-secondary",
      high: "bg-warning/20 text-warning",
      urgent: "bg-destructive/20 text-destructive",
    };
    return colors[priority as keyof typeof colors];
  };

  return (
    <Card className="glass-strong p-6 hover-lift animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Suggestions</h3>
        </div>
        <Button
          onClick={getSuggestions}
          disabled={loading}
          size="sm"
          className="bg-primary hover:bg-primary/90 glow-primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Click "Get Suggestions" to let AI analyze your productivity patterns and recommend tasks
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="glass p-4 rounded-lg animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(suggestion.priority)} variant="outline">
                      {suggestion.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ~{suggestion.estimated_time}m
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => addTaskFromSuggestion(suggestion)}
                  disabled={addingTask === suggestion.title}
                  className="bg-primary/20 hover:bg-primary/30"
                >
                  {addingTask === suggestion.title ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AISuggestions;
