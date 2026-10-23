export const auraGreetings = [
  {
    greeting: "Hello, welcome to AuRA!",
    message: "I'm here to help you learn, one step at a time.",
  },
  {
    greeting: "One step at a time.",
    message: "Take a breath. You can explore at your own pace.",
  },
  {
    greeting: "Curious about autism?",
    message: "We can start by learning together.",
  },
  {
    greeting: "Ready when you are.",
    message: "Sign in to explore AuRA. There's no rush.",
  },
] as const;

export const completionGreeting = [
  { greeting: "You’re all set!", message: "" },
] as const;

export const aboutGreeting = [
  { greeting: "Let’s begin!", message: "" },
  { greeting: "Take your time.", message: "" },
  { greeting: "I'm here to help.", message: "" },
  { greeting: "I'm not an autism diagnosis", message: "" },
] as const;
