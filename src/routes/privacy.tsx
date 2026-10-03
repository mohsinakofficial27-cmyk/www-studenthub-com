import { createFileRoute } from "@tanstack/react-router";

import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Student Hub" },
      { name: "description", content: "What data Student Hub collects, how AI is used and how we protect your information." },
      { property: "og:title", content: "Privacy Policy — Student Hub" },
      { property: "og:description", content: "How Student Hub handles your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <p>Student Hub is a study app for students. This page explains, in plain language, what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name and email address.</li>
        <li>Study content you create: notes, flashcards, quizzes, tasks, exams and study sessions.</li>
        <li>Usage information: for example how many AI questions you ask each day, so we can apply fair usage limits.</li>
        <li>Feedback and contact messages you choose to send us.</li>
      </ul>
      <h2>How we use it</h2>
      <p>We use your data only to run Student Hub: to show your study content, track your progress and improve the app. We do not sell your data.</p>
      <h2>How AI is used</h2>
      <p>When you use the AI Study Assistant, your question and recent messages in that chat are sent securely to our AI provider to generate an answer. Please don't include sensitive personal information in AI questions. AI answers can contain mistakes — always double-check important facts.</p>
      <h2>Who can see your data</h2>
      <p>Your study content is private to your account. Other users cannot see it.</p>
      <h2>Deleting your data</h2>
      <p>You can delete your account from your Profile page, or email us to ask for your data to be removed.</p>
      <h2>Contact</h2>
      <p>Questions? Email <a className="font-medium text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  ),
});
