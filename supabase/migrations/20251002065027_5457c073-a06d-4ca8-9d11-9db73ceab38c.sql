-- Create enum types
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'archived');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  estimated_time INTEGER, -- in minutes
  time_spent INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create pomodoro_sessions table
CREATE TABLE public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  duration INTEGER NOT NULL, -- in minutes
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for pomodoro_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.pomodoro_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.pomodoro_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_task_id ON public.pomodoro_sessions(task_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;