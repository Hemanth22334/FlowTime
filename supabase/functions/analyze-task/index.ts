import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { title, description, priority, estimated_time, deadline } = await req.json();

    console.log("Analyzing task:", { title, priority, estimated_time });

    // Fetch user's task history for context
    const { data: userTasks } = await supabase
      .from('tasks')
      .select('title, priority, estimated_time, time_spent, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch user's Pomodoro patterns
    const { data: pomodoroSessions } = await supabase
      .from('pomodoro_sessions')
      .select('duration, completed')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const avgPomodoroTime = pomodoroSessions && pomodoroSessions.length > 0
      ? Math.round(pomodoroSessions.reduce((acc, s) => acc + s.duration, 0) / pomodoroSessions.length)
      : 25;

    const systemPrompt = `You are an expert task analyst using first principles thinking. Break down tasks into fundamental, actionable steps.

FIRST PRINCIPLES APPROACH:
1. Identify the core objective - what is the fundamental goal?
2. Break into irreducible components - what are the atomic actions needed?
3. Determine dependencies - what must happen before what?
4. Estimate time realistically - consider complexity and skill level
5. Optimize sequence - arrange steps for maximum efficiency

USER CONTEXT:
- Average Pomodoro session: ${avgPomodoroTime} minutes
- Recent task completion patterns: ${userTasks?.length || 0} tasks tracked
- Task priority: ${priority}
- Estimated total time: ${estimated_time || 'not specified'} minutes
- Deadline: ${deadline || 'not specified'}

STEP BREAKDOWN RULES:
- Each step should be 15-60 minutes (ideally 1-2 Pomodoro sessions)
- Steps must be concrete and actionable
- Include preparation, execution, and review phases
- Add buffer time for complex steps (20-30%)
- Consider cognitive load and energy requirements`;

    const userPrompt = `Task Title: ${title}
${description ? `Description: ${description}` : ''}

Analyze this task using first principles and break it down into logical, time-allocated steps. Consider:
- What is the fundamental goal?
- What are the irreducible components?
- What dependencies exist?
- What's the optimal sequence?
- How long will each component realistically take?`;

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "break_down_task",
            description: "Break down a task into sequential, time-allocated steps using first principles analysis",
            parameters: {
              type: "object",
              properties: {
                analysis: {
                  type: "object",
                  properties: {
                    core_objective: { type: "string", description: "The fundamental goal of this task" },
                    complexity_level: { type: "string", enum: ["low", "medium", "high"], description: "Overall complexity" },
                    key_challenges: { type: "array", items: { type: "string" }, description: "Main challenges to overcome" }
                  },
                  required: ["core_objective", "complexity_level", "key_challenges"]
                },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step_order: { type: "number", description: "Sequential order (1, 2, 3...)" },
                      title: { type: "string", description: "Clear, actionable step title" },
                      description: { type: "string", description: "Detailed explanation of what to do" },
                      estimated_duration: { type: "number", description: "Time in minutes" },
                      dependencies: { type: "array", items: { type: "number" }, description: "Step numbers that must be completed first" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Step difficulty" },
                      focus_type: { type: "string", enum: ["research", "creative", "analytical", "execution", "review"], description: "Type of work" }
                    },
                    required: ["step_order", "title", "description", "estimated_duration", "dependencies", "difficulty", "focus_type"]
                  }
                },
                total_estimated_time: { type: "number", description: "Sum of all step durations in minutes" },
                recommended_approach: { type: "string", description: "Overall strategy for tackling this task" }
              },
              required: ["analysis", "steps", "total_estimated_time", "recommended_approach"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "break_down_task" } }
    };

    console.log("Calling Lovable AI for task analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits depleted. Please add credits to continue using AI features.");
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No analysis generated");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("Task breakdown complete:", analysis.steps.length, "steps generated");

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analyze-task function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
