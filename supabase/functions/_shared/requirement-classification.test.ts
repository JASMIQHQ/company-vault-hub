import { classifyRequirement } from "./requirement-classification.ts";

Deno.test("enveloping and marking is procedural", () => {
  const result = classifyRequirement({
    category: "general",
    name: "Enveloping and Marking",
    text: "Bids must be enclosed in separate sealed envelopes and addressed to the Commission.",
  });

  if (result !== "procedural") {
    throw new Error("Envelope instructions must be procedural");
  }
});

Deno.test("soft-copy submission is procedural", () => {
  const result = classifyRequirement({
    category: "general",
    name: "Soft Copy Submission",
    text: "Forward the soft copy through the stated email address.",
  });

  if (result !== "procedural") {
    throw new Error("Soft-copy instructions must be procedural");
  }
});

Deno.test("registration is eligibility evidence", () => {
  const result = classifyRequirement({
    category: "mandatory",
    name: "OGISP Registration",
    text: "Evidence of OGISP registration.",
  });

  if (result !== "eligibility") {
    throw new Error("Registration must be eligibility");
  }
});

Deno.test("work programme and experience are evidence", () => {
  const workProgramme = classifyRequirement({
    category: "technical",
    name: "Work Programme/Schedule",
    text: "Provide a detailed work programme and schedule.",
  });
  const experience = classifyRequirement({
    category: "technical",
    name: "Credibility and Relevant Experience",
    text: "Provide evidence of relevant experience and past projects.",
  });

  if (workProgramme !== "evidence" || experience !== "evidence") {
    throw new Error("Work programme and experience must be evidence");
  }
});

Deno.test("unknown requirement remains general", () => {
  const result = classifyRequirement({
    category: "general",
    name: "General Requirement",
    text: "The bidder shall comply with stated requirements.",
  });

  if (result !== "general") {
    throw new Error("Unknown requirement must remain general");
  }
});
