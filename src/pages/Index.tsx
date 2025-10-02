import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Calendar,
  Brain,
  Bell,
  BarChart3,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "AI-powered calendar with daily, weekly, and monthly views",
    },
    {
      icon: Brain,
      title: "AI Planning",
      description: "Auto-prioritize tasks and balance your workload intelligently",
    },
    {
      icon: Clock,
      title: "Pomodoro Timer",
      description: "Built-in 25/5 cycle timer with auto-logging sessions",
    },
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Never miss a deadline with intelligent notifications",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track productivity with detailed charts and insights",
    },
    {
      icon: RefreshCw,
      title: "Recurring Tasks",
      description: "Set up daily, weekly, or monthly routines effortlessly",
    },
  ];

  return (
    <div className="min-h-screen animated-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(168,85,247,0.15),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.15),transparent_50%)]" />
      
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6 glow-primary float animate-fade-in">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <span className="gradient-text">FlowTime</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
            AI-Powered Productivity Revolution
          </p>
          
          <p className="text-lg text-muted-foreground/80 mb-12 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "300ms" }}>
            Harness the power of AI to optimize your workflow. Task management,
            smart scheduling, Pomodoro timers, and analytics - all in one
            beautiful, futuristic platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "400ms" }}>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 glow-primary hover-lift text-lg px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="glass hover-lift text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">
            Everything You Need to Master Productivity
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="glass-strong p-6 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="glass-strong p-12 text-center hover-lift glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
              Ready to Transform Your Productivity?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who've mastered their time with FlowTime's
              AI-powered features.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 glow-primary hover-lift text-lg px-10"
            >
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-border/50">
          <p className="text-center text-muted-foreground text-sm">
            © 2025 FlowTime. Built with ❤️ for productivity enthusiasts.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
