export function formatOcrText(value: string) {
  return value
    .replace(/\r/gu, "")
    .split(/\n+/u)
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .filter(Boolean)
    .map((line) =>
      /^[A-Z0-9][A-Z0-9 \-:]{2,50}$/u.test(line) && line.length < 52
        ? `## ${line}`
        : line,
    )
    .join("\n");
}

export function scoreVivaAnswer(answer: string) {
  const words = answer.trim().split(/\s+/u).filter(Boolean);
  const score = Math.min(
    10,
    Math.max(
      1,
      Math.round(words.length / 12) +
        (/[.!?]/u.test(answer) ? 2 : 0) +
        (/\b(because|therefore|for example|evidence|since)\b/iu.test(answer) ? 2 : 0),
    ),
  );
  const feedback =
    words.length < 12
      ? "Try expanding your response with a definition, one supporting reason, and a concrete example."
      : /\b(because|therefore|for example|evidence|since)\b/iu.test(answer)
        ? "You gave a reason or example. Strengthen it further by naming the evidence and connecting it directly to the question."
        : "You have a useful starting explanation. Add a clear reason, evidence, and a short example to make the answer more convincing.";
  return { score, feedback };
}
