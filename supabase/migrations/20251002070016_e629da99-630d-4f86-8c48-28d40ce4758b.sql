-- Add recurring task fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
ADD COLUMN recurrence_interval INTEGER DEFAULT 1, -- every N days/weeks/months
ADD COLUMN recurrence_end_date TIMESTAMPTZ;

-- Create table for spaced repetition
CREATE TABLE public.spaced_repetition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  ease_factor DECIMAL DEFAULT 2.5, -- SM-2 algorithm ease factor
  interval INTEGER DEFAULT 1, -- days until next review
  repetitions INTEGER DEFAULT 0,
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for spaced_repetition_items
ALTER TABLE public.spaced_repetition_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spaced_repetition_items
CREATE POLICY "Users can view their own review items"
  ON public.spaced_repetition_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own review items"
  ON public.spaced_repetition_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review items"
  ON public.spaced_repetition_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review items"
  ON public.spaced_repetition_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_spaced_repetition_user_id ON public.spaced_repetition_items(user_id);
CREATE INDEX idx_spaced_repetition_next_review ON public.spaced_repetition_items(next_review_date);
CREATE INDEX idx_tasks_recurring ON public.tasks(is_recurring) WHERE is_recurring = true;

-- Create trigger for spaced_repetition_items updated_at
CREATE TRIGGER update_spaced_repetition_items_updated_at
  BEFORE UPDATE ON public.spaced_repetition_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for spaced_repetition_items
ALTER TABLE public.spaced_repetition_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spaced_repetition_items;