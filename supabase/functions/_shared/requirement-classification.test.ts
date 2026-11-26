import { classifyRequirement } from "./requirement-classification.ts";
Deno.test("enveloping and marking is procedural", () => {
  if (classifyRequirement({ category: "general", name: "Enveloping and Marking", text: "Bids must be enclosed in separate sealed envelopes and addressed to the Commission." }) !== "procedural") throw new Error("Envelope instructions must be procedural");
});
Deno.test("soft-copy submission is procedural", () => {
  if (classifyRequirement({ category: "general", name: "Soft Copy Submission", text: "Forward the soft copy through the stated email address." }) !== "procedural") throw new Error("Soft-copy instructions must be procedural");
});
Deno.test("registration is eligibility evidence", () => {
  if (classifyRequirement({ category: "mandatory", name: "OGISP Registration", text: "Evidence of OGISP registration." }) !== "eligibility") throw new Error("Registration must be eligibility");
});
Deno.test("work programme and experience are evidence", () => {
  if (classifyRequirement({ category: "technical", name: "Work Programme/Schedule", text: "Provide a detailed work programme and schedule." }) !== "evidence") throw new Error("Work programme must be evidence");
  if (classifyRequirement({ category: "technical", name: "Credibility and Relevant Experience", text: "Provide evidence of relevant experience and past projects." }) !== "evidence") throw new Error("Experience must be evidence");
});
Deno.test("unknown requirement remains general", () => {
  if (classifyRequirement({ category: "general", name: "General Requirement", text: "The bidder shall comply with stated requirements." }) !== "general") throw new Error("Unknown requirement must remain general");
});