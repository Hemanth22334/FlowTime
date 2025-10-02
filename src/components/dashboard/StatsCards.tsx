import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, TrendingUp, Target } from "lucide-react";

interface StatsCardsProps {
  userId: string;
}

const StatsCards = ({ userId }: StatsCardsProps) => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalTime: 0,
    pomodoroSessions: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get tasks stats
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status, time_spent")
        .eq("user_id", userId);

      // Get pomodoro sessions
      const { data: sessions } = await supabase
        .from("pomodoro_sessions")
        .select("duration")
        .eq("user_id", userId);

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
      const totalTime = tasks?.reduce((sum, t) => sum + (t.time_spent || 0), 0) || 0;
      const pomodoroSessions = sessions?.length || 0;

      setStats({
        totalTasks,
        completedTasks,
        totalTime,
        pomodoroSessions,
      });
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("stats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const statCards = [
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completed",
      value: stats.completedTasks,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Time Spent",
      value: `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
      icon: Clock,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Pomodoros",
      value: stats.pomodoroSessions,
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {statCards.map((stat, index) => (
        <Card
          key={stat.title}
          className="glass-strong p-4 hover-lift animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} p-2 rounded-lg`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
