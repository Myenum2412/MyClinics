import { z } from "zod";

export const doctorOverviewQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
}).refine(
  (data) => {
    if (data.from && data.to) return data.from <= data.to;
    return true;
  },
  { message: "from must be <= to", path: ["from"] }
);

export type DoctorOverviewQuery = z.infer<typeof doctorOverviewQuerySchema>;
