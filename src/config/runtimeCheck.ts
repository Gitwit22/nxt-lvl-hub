import { PROGRAM_DOMAIN } from "./program";

export function validateProgramDomain() {
  if (!PROGRAM_DOMAIN) {
    throw new Error("PROGRAM_DOMAIN is not set.");
  }

  console.log(
    `[Startup] Program domain initialized: ${PROGRAM_DOMAIN}`
  );
}
