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

    // Get user from auth header
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get user's existing tasks for context
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, priority, status, estimated_time")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get pomodoro stats
    const { data: sessions } = await supabase
      .from("pomodoro_sessions")
      .select("duration, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const totalPomodoroTime = sessions?.reduce((sum, s) => sum + s.duration, 0) || 0;
    const avgDailyPomodoros = sessions ? Math.round(sessions.length / 7) : 0;

    // Build context for AI
    const context = `
User's productivity profile:
- Recent tasks: ${tasks?.map(t => `${t.title} (${t.priority}, ${t.status})`).join(", ") || "No tasks yet"}
- Total pomodoro time this week: ${totalPomodoroTime} minutes
- Average daily pomodoros: ${avgDailyPomodoros}

Based on this profile, suggest 3-5 specific, actionable tasks that would help improve their productivity.
Consider their current priorities and work patterns.
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
            content: "You are a productivity AI assistant. Suggest specific, actionable tasks with appropriate priorities and time estimates.",
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
              name: "suggest_tasks",
              description: "Return 3-5 actionable task suggestions with priorities and time estimates.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Clear, specific task title",
                        },
                        description: {
                          type: "string",
                          description: "Brief explanation of why this task is suggested",
                        },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high", "urgent"],
                          description: "Task priority based on user's current workload",
                        },
                        estimated_time: {
                          type: "integer",
                          description: "Estimated time in minutes",
                        },
                      },
                      required: ["title", "description", "priority", "estimated_time"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_tasks" } },
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
      throw new Error("No suggestions generated");
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in ai-task-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
