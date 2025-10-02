import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PomodoroTimerProps {
  userId: string;
}

const PomodoroTimer = ({ userId }: PomodoroTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Pleasant notification sound
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, context.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playNotificationSound();

    if (!isBreak) {
      // Log pomodoro session
      await supabase.from("pomodoro_sessions").insert({
        user_id: userId,
        duration: 25,
        completed: true,
      });
      toast.success("🎉 Pomodoro completed! Time for a 5-minute break.");
      setTimeLeft(5 * 60);
      setIsBreak(true);
    } else {
      toast.success("☕ Break completed! Ready for another pomodoro?");
      setTimeLeft(25 * 60);
      setIsBreak(false);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progress = isBreak
    ? ((5 * 60 - timeLeft) / (5 * 60)) * 100
    : ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  return (
    <Card className="glass-strong p-6 hover-lift animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Pomodoro Timer</h3>
      </div>

      <div className="relative mb-6">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-5xl font-bold gradient-text mb-2">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p className="text-sm text-muted-foreground">
          {isBreak ? "Break Time" : "Focus Time"}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={toggleTimer}
          className="flex-1 bg-primary hover:bg-primary/90 glow-primary"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start
            </>
          )}
        </Button>
        <Button
          onClick={resetTimer}
          variant="outline"
          className="glass"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setSoundEnabled(!soundEnabled)}
          variant="outline"
          className="glass"
          title={soundEnabled ? "Mute notifications" : "Enable notifications"}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      </div>
    </Card>
  );
};

export default PomodoroTimer;
