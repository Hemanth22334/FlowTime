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

    const systemPrompt = `You are an expert productivity coach who helps people succeed at tasks by providing comprehensive preparation guidance.

YOUR APPROACH:
1. Start with environment and workspace preparation
2. List important precautions and what to avoid
3. Provide practical tips and best practices
4. Break down the actual work into clear steps
5. Include review and completion steps

USER CONTEXT:
- Average Pomodoro session: ${avgPomodoroTime} minutes
- Recent task patterns: ${userTasks?.length || 0} tasks tracked
- Priority: ${priority}
- Estimated time: ${estimated_time || 'not specified'} minutes
- Deadline: ${deadline || 'not specified'}

STEP CATEGORIES TO INCLUDE:
1. PREPARATION (focus_type: "preparation"): Environment setup, workspace organization, gathering materials
2. PRECAUTIONS (focus_type: "review"): Safety measures, common mistakes to avoid, important warnings
3. EXECUTION (focus_type: "execution"): The actual work steps in logical order
4. TIPS & BEST PRACTICES (focus_type: "creative"): Pro tips, efficiency hacks, quality improvements
5. REVIEW (focus_type: "review"): Checking work, final touches, cleanup

TIME ALLOCATION:
- Preparation steps: 5-15 minutes each
- Work steps: 15-45 minutes each
- Tips can be quick reminders: 2-5 minutes
- Each step should fit within a Pomodoro session`;

    const userPrompt = `Task: ${title}
${description ? `Description: ${description}` : ''}

Create a comprehensive step-by-step guide including:
1. How to prepare the environment and workspace
2. Important precautions and things to avoid
3. The actual work broken into clear steps
4. Helpful tips and best practices for success
5. How to review and complete the task properly

Make it practical and actionable - like you're coaching someone to succeed at this task.`;

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
            description: "Provide comprehensive task guidance including preparation, precautions, execution steps, and tips",
            parameters: {
              type: "object",
              properties: {
                analysis: {
                  type: "object",
                  properties: {
                    core_objective: { type: "string", description: "What the task aims to achieve" },
                    complexity_level: { type: "string", enum: ["low", "medium", "high"], description: "Overall complexity" },
                    key_success_factors: { type: "array", items: { type: "string" }, description: "What will make this task successful" }
                  },
                  required: ["core_objective", "complexity_level", "key_success_factors"]
                },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step_order: { type: "number", description: "Sequential order (1, 2, 3...)" },
                      title: { type: "string", description: "Clear, actionable step title" },
                      description: { type: "string", description: "Detailed explanation - be specific and practical" },
                      estimated_duration: { type: "number", description: "Time in minutes" },
                      dependencies: { type: "array", items: { type: "number" }, description: "Step numbers that must be completed first" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Step difficulty" },
                      focus_type: { type: "string", enum: ["preparation", "creative", "analytical", "execution", "review"], description: "preparation=setup/environment, execution=actual work, review=precautions/checks, creative=tips/best practices, analytical=planning" }
                    },
                    required: ["step_order", "title", "description", "estimated_duration", "dependencies", "difficulty", "focus_type"]
                  }
                },
                total_estimated_time: { type: "number", description: "Sum of all step durations in minutes" },
                recommended_approach: { type: "string", description: "Overall strategy and mindset for success" }
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
