import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { date } = await req.json();
    const targetDate = date ? new Date(date) : new Date();

    // Get user from auth header
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get pending and in-progress tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, priority, estimated_time, deadline, description")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_progress"])
      .order("priority", { ascending: false });

    // Get recent pomodoro stats for work patterns
    const { data: sessions } = await supabase
      .from("pomodoro_sessions")
      .select("created_at, duration")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    // Analyze work patterns
    const workHours = sessions?.map(s => {
      const hour = new Date(s.created_at).getHours();
      return hour;
    }) || [];
    
    const avgWorkHour = workHours.length > 0 
      ? Math.round(workHours.reduce((sum, h) => sum + h, 0) / workHours.length)
      : 9;

    // Build context for AI
    const context = `
Generate an optimized daily timetable for ${targetDate.toDateString()}.

Available tasks:
${tasks?.map(t => `- "${t.title}" (${t.priority} priority, ${t.estimated_time || 30}min${t.deadline ? `, deadline: ${new Date(t.deadline).toLocaleDateString()}` : ''})`).join('\n') || 'No pending tasks'}

User's typical work pattern:
- Usually works around ${avgWorkHour}:00
- Completed ${sessions?.length || 0} pomodoro sessions this week
- Average productivity: ${sessions ? Math.round(sessions.length / 7) : 0} sessions/day

Create a realistic daily schedule (8:00 AM - 8:00 PM) that:
1. Schedules high-priority urgent tasks first, especially those with approaching deadlines
2. Alternates between work sessions and breaks (follow Pomodoro: 25min work, 5min break)
3. Places complex tasks during peak hours (around ${avgWorkHour}:00)
4. Groups similar tasks together
5. Includes lunch break (12:00-13:00) and regular short breaks
6. Accounts for estimated task durations
7. Leaves buffer time for unexpected tasks

Return a structured schedule with time slots.
`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a productivity AI that creates optimized daily schedules. Consider work-life balance, task priorities, deadlines, and realistic time management.",
          },
          {
            role: "user",
            content: context,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_timetable",
              description: "Generate an optimized daily timetable with time slots",
              parameters: {
                type: "object",
                properties: {
                  schedule: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: {
                          type: "string",
                          description: "Time in HH:MM format (24-hour)",
                        },
                        duration: {
                          type: "integer",
                          description: "Duration in minutes",
                        },
                        task_id: {
                          type: "string",
                          description: "Task ID if applicable, null for breaks/meals",
                        },
                        title: {
                          type: "string",
                          description: "Activity title",
                        },
                        type: {
                          type: "string",
                          enum: ["task", "break", "meal", "buffer"],
                          description: "Type of activity",
                        },
                        priority: {
                          type: "string",
                          enum: ["urgent", "high", "medium", "low", "none"],
                        },
                      },
                      required: ["time", "duration", "title", "type", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["schedule"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_timetable" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI service error");
    }

    const data = await aiResponse.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No schedule generated");
    }

    const schedule = JSON.parse(toolCall.function.arguments).schedule;

    return new Response(JSON.stringify({ schedule, date: targetDate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in generate-timetable:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
