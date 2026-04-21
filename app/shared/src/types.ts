export type ClaimStatus = "pending" | "approved" | "rejected" | "failed";

export interface Claim {
  id: string;
  customerId: string;
  amountCents: number;
  description: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimJob {
  claimId: string;
  enqueuedAt: string;
}
