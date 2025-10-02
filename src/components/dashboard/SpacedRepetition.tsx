import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Check, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReviewItem {
  id: string;
  title: string;
  content: string | null;
  next_review_date: string;
  repetitions: number;
  ease_factor: number;
}

interface SpacedRepetitionProps {
  userId: string;
}

const SpacedRepetition = ({ userId }: SpacedRepetitionProps) => {
  const [dueItems, setDueItems] = useState<ReviewItem[]>([]);
  const [currentItem, setCurrentItem] = useState<ReviewItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", content: "" });

  useEffect(() => {
    fetchDueItems();
  }, [userId]);

  const fetchDueItems = async () => {
    const { data } = await supabase
      .from("spaced_repetition_items")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review_date", new Date().toISOString())
      .order("next_review_date");

    setDueItems(data || []);
    if (data && data.length > 0 && !currentItem) {
      setCurrentItem(data[0]);
    }
  };

  const calculateNextReview = (
    quality: number,
    repetitions: number,
    easeFactor: number,
    interval: number
  ) => {
    // SM-2 Algorithm
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    let newInterval = 1;
    let newRepetitions = repetitions;

    if (quality >= 3) {
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
      newRepetitions++;
    } else {
      newRepetitions = 0;
      newInterval = 1;
    }

    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
    };
  };

  const reviewItem = async (quality: number) => {
    if (!currentItem) return;

    const { easeFactor, interval, repetitions } = calculateNextReview(
      quality,
      currentItem.repetitions,
      parseFloat(currentItem.ease_factor.toString()),
      1
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    await supabase
      .from("spaced_repetition_items")
      .update({
        ease_factor: easeFactor,
        interval,
        repetitions,
        next_review_date: nextReviewDate.toISOString(),
      })
      .eq("id", currentItem.id);

    const remaining = dueItems.filter((item) => item.id !== currentItem.id);
    setDueItems(remaining);
    setCurrentItem(remaining.length > 0 ? remaining[0] : null);

    toast.success(quality >= 3 ? "Great! ✅" : "Try again soon 📚");
  };

  const addReviewItem = async () => {
    if (!newItem.title.trim()) return;

    const { error } = await supabase.from("spaced_repetition_items").insert({
      user_id: userId,
      title: newItem.title,
      content: newItem.content || null,
    });

    if (error) {
      toast.error("Failed to add item");
      return;
    }

    toast.success("Review item added!");
    setNewItem({ title: "", content: "" });
    setShowAddDialog(false);
    fetchDueItems();
  };

  return (
    <Card className="glass-strong p-6 hover-lift animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Spaced Repetition</h3>
          <Badge variant="secondary">{dueItems.length} due</Badge>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="glass">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle className="gradient-text">Add Review Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-title">Title</Label>
                <Input
                  id="review-title"
                  placeholder="What do you want to remember?"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-content">Content</Label>
                <Textarea
                  id="review-content"
                  placeholder="Key points, facts, or concepts..."
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  className="glass resize-none"
                  rows={4}
                />
              </div>
              <Button
                onClick={addReviewItem}
                className="w-full bg-primary hover:bg-primary/90 glow-primary"
              >
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {currentItem ? (
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium mb-2">{currentItem.title}</h4>
            {currentItem.content && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentItem.content}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Reviews: {currentItem.repetitions}</span>
              <span>•</span>
              <span>Ease: {currentItem.ease_factor.toFixed(1)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">How well did you recall this?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => reviewItem(1)}
                variant="outline"
                className="glass hover:bg-destructive/10"
              >
                <X className="w-4 h-4 mr-2" />
                Forgot
              </Button>
              <Button
                onClick={() => reviewItem(3)}
                variant="outline"
                className="glass hover:bg-warning/10"
              >
                Hard
              </Button>
              <Button
                onClick={() => reviewItem(4)}
                variant="outline"
                className="glass hover:bg-secondary/10"
              >
                Good
              </Button>
              <Button
                onClick={() => reviewItem(5)}
                variant="outline"
                className="glass hover:bg-success/10"
              >
                <Check className="w-4 h-4 mr-2" />
                Easy
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium mb-1">All caught up!</h4>
          <p className="text-sm text-muted-foreground">
            No reviews due right now. Come back later.
          </p>
        </div>
      )}
    </Card>
  );
};

export default SpacedRepetition;
