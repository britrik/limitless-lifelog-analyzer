import React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility

// Basic Button component (can be replaced with Shadcn Button later)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
}

const Button: React.FC<ButtonProps> = ({ className, variant, size, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    icon: "h-10 w-10",
  };
  return (
    <button
      className={cn(
        baseStyle,
        variants[variant || "default"],
        sizes[size || "default"],
        className
      )}
      {...props}
    />
  );
};


export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-1 border border-border rounded-full p-0.5 bg-muted">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
            "rounded-full w-8 h-8",
            theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        )}
        onClick={() => setTheme("light")}
        aria-label="Switch to light theme"
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
            "rounded-full w-8 h-8",
            theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        )}
        onClick={() => setTheme("dark")}
        aria-label="Switch to dark theme"
      >
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
            "rounded-full w-8 h-8",
            theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        )}
        onClick={() => setTheme("system")}
        aria-label="Switch to system theme"
      >
        <Laptop className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    </div>
  );
}
