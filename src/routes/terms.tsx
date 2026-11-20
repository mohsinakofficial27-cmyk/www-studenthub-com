import { createFileRoute } from "@tanstack/react-router";

import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Student Hub" },
      {
        name: "description",
        content: "The simple rules for using Student Hub, the free AI study app for students.",
      },
      { property: "og:title", content: "Terms of Use — Student Hub" },
      { property: "og:description", content: "The rules for using Student Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Use" updated="October 2026">
      <p>By using Student Hub you agree to these terms. We keep them short and clear.</p>
      <h2>Using Student Hub</h2>
      <ul>
        <li>
          All Student Hub features are available to registered users at no charge. Fair daily limits
          apply to AI questions.
        </li>
        <li>Keep your login details safe; you are responsible for activity on your account.</li>
        <li>Don't misuse the service, try to break it, or access other people's data.</li>
      </ul>
      <h2>Academic honesty</h2>
      <p>
        Student Hub is designed to help you learn — not to do your work for you. Follow your
        school's rules on using AI tools, and don't submit AI answers as your own work where that
        isn't allowed.
      </p>
      <h2>AI answers</h2>
      <p>
        AI-generated content may be incomplete or wrong. Use it as a study aid and check important
        information with your teacher or course materials. AI features rely on an external service,
        may be subject to fair-use limits or interruption, and may incur operating costs for Student
        Hub. Users are not charged through the app.
      </p>
      <h2>Your content</h2>
      <p>
        Notes and other content you create belong to you. You give us permission to store and
        process it only so we can run the app for you.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms or the features of Student Hub. We will communicate material
        changes clearly.
      </p>
      <h2>Contact</h2>
      <p>
        Email{" "}
        <a className="font-medium text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  ),
});
