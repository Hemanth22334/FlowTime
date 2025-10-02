-- Create task_steps table for storing AI-generated step breakdowns
CREATE TABLE public.task_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_duration INTEGER NOT NULL, -- in minutes
  dependencies TEXT[], -- array of step IDs that must be completed first
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own task steps"
  ON public.task_steps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task steps"
  ON public.task_steps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task steps"
  ON public.task_steps
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task steps"
  ON public.task_steps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_task_steps_updated_at
  BEFORE UPDATE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX idx_task_steps_user_id ON public.task_steps(user_id);