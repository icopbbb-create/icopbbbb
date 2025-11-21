import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          dark: "hsl(var(--brand-dark))",
          gold: "hsl(var(--brand-gold))",
          "gold-light": "hsl(var(--brand-gold-light))",
          "gold-dark": "hsl(var(--brand-gold-dark))",
          cream: "hsl(var(--brand-cream))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "golden-flame": {
          "0%, 100%": { 
            filter: "brightness(1) drop-shadow(0 0 10px hsl(43 96% 56% / 0.6))",
            transform: "scale(1)"
          },
          "25%": { 
            filter: "brightness(1.3) drop-shadow(0 0 20px hsl(43 96% 56% / 0.8))",
            transform: "scale(1.02)"
          },
          "50%": { 
            filter: "brightness(0.9) drop-shadow(0 0 15px hsl(43 96% 56% / 0.5))",
            transform: "scale(0.98)"
          },
          "75%": { 
            filter: "brightness(1.2) drop-shadow(0 0 25px hsl(48 100% 67% / 0.9))",
            transform: "scale(1.01)"
          }
        },
        "shimmer": {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateX(100%)" }
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(43 96% 56% / 0.4), 0 0 40px hsl(43 96% 56% / 0.2)"
          },
          "50%": { 
            boxShadow: "0 0 30px hsl(43 96% 56% / 0.6), 0 0 60px hsl(43 96% 56% / 0.4)"
          }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "flame-rise": {
          "0%": { 
            transform: "translateY(0%) scaleY(1)",
            opacity: "0.8"
          },
          "50%": { 
            transform: "translateY(-20%) scaleY(1.1)",
            opacity: "0.6"
          },
          "100%": { 
            transform: "translateY(-40%) scaleY(1.2)",
            opacity: "0.4"
          }
        },
        "flame-rise-delayed": {
          "0%": { 
            transform: "translateY(0%) scaleY(1)",
            opacity: "0.6"
          },
          "50%": { 
            transform: "translateY(-15%) scaleY(1.05)",
            opacity: "0.4"
          },
          "100%": { 
            transform: "translateY(-30%) scaleY(1.15)",
            opacity: "0.2"
          }
        },
        "flame-flicker": {
          "0%, 100%": { 
            opacity: "0.3",
            transform: "translateY(0%) scaleX(1)"
          },
          "25%": { 
            opacity: "0.5",
            transform: "translateY(-10%) scaleX(0.95)"
          },
          "50%": { 
            opacity: "0.4",
            transform: "translateY(-5%) scaleX(1.05)"
          },
          "75%": { 
            opacity: "0.6",
            transform: "translateY(-15%) scaleX(0.98)"
          }
        },
        "flame-intense": {
          "0%": { 
            transform: "translateY(0%) scaleY(1) scaleX(1)",
            opacity: "0.5"
          },
          "33%": { 
            transform: "translateY(-25%) scaleY(1.15) scaleX(0.92)",
            opacity: "0.7"
          },
          "66%": { 
            transform: "translateY(-10%) scaleY(1.05) scaleX(1.08)",
            opacity: "0.4"
          },
          "100%": { 
            transform: "translateY(-35%) scaleY(1.25) scaleX(0.95)",
            opacity: "0.3"
          }
        },
        "ember-rise": {
          "0%": { 
            transform: "translateY(0px) translateX(0px) scale(1)",
            opacity: "1"
          },
          "50%": {
            transform: "translateY(-50vh) translateX(10px) scale(0.8)",
            opacity: "0.6"
          },
          "100%": { 
            transform: "translateY(-100vh) translateX(-5px) scale(0.3)",
            opacity: "0"
          }
        },
        "ember-rise-slow": {
          "0%": { 
            transform: "translateY(0px) translateX(0px) scale(1)",
            opacity: "1"
          },
          "50%": {
            transform: "translateY(-40vh) translateX(-8px) scale(0.9)",
            opacity: "0.7"
          },
          "100%": { 
            transform: "translateY(-80vh) translateX(12px) scale(0.4)",
            opacity: "0"
          }
        },
        "ember-rise-fast": {
          "0%": { 
            transform: "translateY(0px) translateX(0px) scale(1)",
            opacity: "1"
          },
          "50%": {
            transform: "translateY(-60vh) translateX(-12px) scale(0.7)",
            opacity: "0.5"
          },
          "100%": { 
            transform: "translateY(-120vh) translateX(8px) scale(0.2)",
            opacity: "0"
          }
        },
        "smoke-rise": {
          "0%": { 
            transform: "translateY(0px) scale(0.8)",
            opacity: "0.15"
          },
          "50%": {
            transform: "translateY(-40vh) scale(1.2)",
            opacity: "0.08"
          },
          "100%": { 
            transform: "translateY(-80vh) scale(1.5)",
            opacity: "0"
          }
        },
        "smoke-rise-slow": {
          "0%": { 
            transform: "translateY(0px) scale(0.9)",
            opacity: "0.12"
          },
          "50%": {
            transform: "translateY(-30vh) scale(1.3)",
            opacity: "0.06"
          },
          "100%": { 
            transform: "translateY(-60vh) scale(1.6)",
            opacity: "0"
          }
        },
        "heat-wave": {
          "0%, 100%": { 
            transform: "translateY(0px) scaleY(1)",
            opacity: "0.8"
          },
          "25%": { 
            transform: "translateY(-5px) scaleY(1.02)",
            opacity: "0.9"
          },
          "50%": { 
            transform: "translateY(-2px) scaleY(0.98)",
            opacity: "0.7"
          },
          "75%": { 
            transform: "translateY(-8px) scaleY(1.03)",
            opacity: "0.85"
          }
        },
        "heat-wave-delayed": {
          "0%, 100%": { 
            transform: "translateY(0px) scaleY(1) scaleX(1)",
            opacity: "0.6"
          },
          "33%": { 
            transform: "translateY(-6px) scaleY(1.03) scaleX(0.99)",
            opacity: "0.8"
          },
          "66%": { 
            transform: "translateY(-3px) scaleY(0.97) scaleX(1.01)",
            opacity: "0.5"
          }
        },
        "heat-shimmer": {
          "0%": { 
            transform: "translateX(-100%) skewX(10deg)",
            opacity: "0"
          },
          "50%": { 
            opacity: "1"
          },
          "100%": { 
            transform: "translateX(100%) skewX(-10deg)",
            opacity: "0"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "golden-flame": "golden-flame 3s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "flame-rise": "flame-rise 4s ease-in-out infinite",
        "flame-rise-delayed": "flame-rise-delayed 5s ease-in-out infinite",
        "flame-flicker": "flame-flicker 2s ease-in-out infinite",
        "flame-intense": "flame-intense 3s ease-in-out infinite",
        "ember-rise": "ember-rise 6s ease-out infinite",
        "ember-rise-slow": "ember-rise-slow 8s ease-out infinite",
        "ember-rise-fast": "ember-rise-fast 4s ease-out infinite",
        "smoke-rise": "smoke-rise 10s ease-out infinite",
        "smoke-rise-slow": "smoke-rise-slow 12s ease-out infinite",
        "heat-wave": "heat-wave 2s ease-in-out infinite",
        "heat-wave-delayed": "heat-wave-delayed 3s ease-in-out infinite",
        "heat-shimmer": "heat-shimmer 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
