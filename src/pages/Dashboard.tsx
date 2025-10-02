import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import StatsCards from "@/components/dashboard/StatsCards";
import TaskList from "@/components/dashboard/TaskList";
import PomodoroTimer from "@/components/dashboard/PomodoroTimer";
import AddTaskDialog from "@/components/dashboard/AddTaskDialog";
import AISuggestions from "@/components/dashboard/AISuggestions";
import CalendarView from "@/components/dashboard/CalendarView";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import SpacedRepetition from "@/components/dashboard/SpacedRepetition";
import Timetable from "@/components/dashboard/Timetable";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading FlowTime...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen animated-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">FlowTime</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {session.user.email?.split("@")[0]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTask(true)}
                className="glass hover-lift"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="glass hover-lift"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Stats and Timer */}
            <div className="space-y-6">
              <StatsCards userId={session.user.id} />
              <PomodoroTimer userId={session.user.id} />
              <AISuggestions userId={session.user.id} />
              <SpacedRepetition userId={session.user.id} />
            </div>

            {/* Right Column - Tasks & Timetable */}
            <div className="lg:col-span-2 space-y-6">
              <Timetable userId={session.user.id} />
              <TaskList userId={session.user.id} />
            </div>
          </div>

          {/* Bottom Row - Calendar and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CalendarView userId={session.user.id} />
            <AnalyticsChart userId={session.user.id} />
          </div>
        </main>
      </div>

      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        userId={session.user.id}
      />
    </div>
  );
};

export default Dashboard;
