import { handle } from "@/lib/dal/http";
import { workspaceContext } from "@/lib/dal/session";
import { intakeRotationPlan } from "@/lib/dal/vault";

export async function GET() {
  return handle("vault.intake_plan", async () => intakeRotationPlan(await workspaceContext()));
}
