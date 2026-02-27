import Replicate from "replicate";

let replicateInstance: Replicate | null = null;

export function getReplicateClient(): Replicate {
  if (!replicateInstance) {
    replicateInstance = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!,
    });
  }
  return replicateInstance;
}
