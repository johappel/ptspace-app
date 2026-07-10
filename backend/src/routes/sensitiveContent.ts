import { FastifyInstance } from "fastify";
import { z } from "zod";
import { SensitiveContentScanner } from "../services/privacy/SensitiveContentScanner.js";

const ScanInputSchema = z.object({ text: z.string().default("") });

export async function sensitiveContentRoutes(app: FastifyInstance, deps: { scanner: SensitiveContentScanner }) {
  app.post("/sensitive-content/scan", async (request, reply) => {
    const parsed = ScanInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Der Text konnte noch nicht geprüft werden." });
    }
    const findings = deps.scanner.scan(parsed.data.text);
    return {
      findings,
      message:
        findings.length === 0
          ? "Keine sensiblen Hinweise gefunden."
          : "Ich habe Hinweise gefunden, die vor Export oder Weitergabe geprüft werden sollten."
    };
  });
}