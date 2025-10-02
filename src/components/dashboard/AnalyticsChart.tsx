import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsChartProps {
  userId: string;
}

const AnalyticsChart = ({ userId }: AnalyticsChartProps) => {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    // Get last 7 days of completed tasks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("completed_at, priority, time_spent")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", sevenDaysAgo.toISOString());

    // Group by day
    const dailyTasks: Record<string, { completed: number; timeSpent: number }> = {};
    const priorityCounts: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    tasks?.forEach((task) => {
      if (task.completed_at) {
        const day = new Date(task.completed_at).toLocaleDateString("en-US", {
          weekday: "short",
        });
        dailyTasks[day] = dailyTasks[day] || { completed: 0, timeSpent: 0 };
        dailyTasks[day].completed++;
        dailyTasks[day].timeSpent += task.time_spent || 0;
      }
      if (task.priority) {
        priorityCounts[task.priority]++;
      }
    });

    // Format for charts
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekData = days.map((day) => ({
      day,
      completed: dailyTasks[day]?.completed || 0,
      timeSpent: Math.round((dailyTasks[day]?.timeSpent || 0) / 60), // Convert to hours
    }));

    const priorityChartData = Object.entries(priorityCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setWeeklyData(weekData);
    setPriorityData(priorityChartData);
  };

  const COLORS = {
    urgent: "hsl(var(--destructive))",
    high: "hsl(var(--warning))",
    medium: "hsl(var(--secondary))",
    low: "hsl(var(--muted))",
  };

  return (
    <Card className="glass-strong p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Analytics</h3>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="glass w-full">
          <TabsTrigger value="weekly" className="flex-1">
            Weekly Progress
          </TabsTrigger>
          <TabsTrigger value="priority" className="flex-1">
            By Priority
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Tasks completed per day this week
          </p>
        </TabsContent>

        <TabsContent value="priority" className="mt-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Completed tasks by priority level
          </p>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AnalyticsChart;
