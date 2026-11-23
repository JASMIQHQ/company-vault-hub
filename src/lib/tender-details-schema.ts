import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable();

const nullableDate = z.string().datetime({ offset: true }).nullable();

const TenderDetailsObjectSchema = z.object({
    title: z.string().trim().min(1, "Tender title is required.").max(300),
    procuring_entity: nullableText(500),
    reference_number: nullableText(160),
    procurement_method: nullableText(160),
    tender_type: nullableText(160),
    industry: nullableText(160),
    submission_deadline: nullableDate,
    opening_date: nullableDate,
    requires_bid_security: z.boolean(),
    requires_bank_reference: z.boolean(),
    requires_affidavit: z.boolean(),
  });

export const TenderDetailsPatchSchema = TenderDetailsObjectSchema.partial();

export const TenderDetailsSchema = TenderDetailsObjectSchema.superRefine((details, context) => {
    if (
      details.opening_date &&
      details.submission_deadline &&
      new Date(details.opening_date).getTime() <
        new Date(details.submission_deadline).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["opening_date"],
        message: "Opening date cannot be earlier than the submission deadline.",
      });
    }
  });

export type TenderDetails = z.infer<typeof TenderDetailsSchema>;
export type TenderDetailsPatch = Partial<TenderDetails>;
