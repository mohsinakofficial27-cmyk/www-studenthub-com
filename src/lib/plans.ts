import type { PlanId } from "./store";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  cta: string;
  featured?: boolean;
  premium?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Get started with the core study tools.",
    cta: "Start Free",
    features: [
      "Basic study tools",
      "Limited AI questions",
      "Basic notes",
      "Limited quizzes",
      "Pomodoro timer",
      "Study planner",
    ],
  },
  {
    id: "student",
    name: "Student",
    price: 10,
    tagline: "For students studying every day.",
    cta: "Upgrade to Student",
    featured: true,
    features: [
      "Everything in Free",
      "Higher AI usage limits",
      "Notes without a saved-note cap",
      "More quiz generation",
      "AI summaries",
      "Flashcards",
      "Advanced study planner",
      "Progress tracking",
      "Priority access to new features",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 20,
    tagline: "Exam season, fully equipped.",
    cta: "Upgrade to Pro",
    premium: true,
    features: [
      "Everything in Student",
      "Highest AI usage limits",
      "Advanced AI Study Assistant",
      "PDF / document study tools",
      "AI-generated study plans",
      "Advanced quiz generation",
      "Highest flashcard limits",
      "Advanced progress analytics",
      "Exam preparation tools",
      "Priority support",
      "Early access to new features",
    ],
  },
];

export function planById(id: PlanId) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]!;
}
