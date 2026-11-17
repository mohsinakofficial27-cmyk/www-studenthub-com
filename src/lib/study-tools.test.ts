import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatOcrText, scoreVivaAnswer } from "./study-tools";

describe("local study-tool helpers", () => {
  it("cleans OCR line spacing and structures all-caps headings", () => {
    assert.equal(formatOcrText("  CELL   BIOLOGY \r\n\nCells   are alive.  "),
      "## CELL BIOLOGY\nCells are alive.",
    );
  });

  it("returns bounded, explicitly heuristic viva feedback", () => {
    assert.equal(scoreVivaAnswer("").score, 1);
    const developedAnswer = scoreVivaAnswer(
      "The process changes over time because the evidence supports this example and explains how the result follows from the original observations.",
    );
    assert.ok(developedAnswer.score > 1);
    assert.ok(developedAnswer.score <= 10);
    assert.match(developedAnswer.feedback, /reason or example/u);
  });
});
