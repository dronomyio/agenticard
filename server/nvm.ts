/**
 * Nevermined x402 Payment Integration
 *
 * This module simulates the Nevermined payments-py SDK pattern:
 *   - Token verification (verify_token)
 *   - Credit settlement (settle_token)
 *   - Payment required response (build_payment_required)
 *
 * In production, replace the mock implementations with:
 *   import { Payments } from "@nevermined-io/payments";
 *   const payments = new Payments({ nvmApiKey: process.env.NVM_API_KEY, environment: "testing" });
 */

export interface X402PaymentRequired {
  scheme: "x402";
  network: "nevermined-sandbox";
  planId: string;
  agentId: string;
  endpoint: string;
  method: string;
  creditsRequired: number;
  subscribeUrl: string;
}

export interface X402VerifyResult {
  valid: boolean;
  reason?: string;
  userId?: string;
  planId?: string;
  creditsAvailable?: number;
}

/**
 * Build a 402 Payment Required response spec for a protected endpoint.
 * In production this calls: nvm_manager.build_payment_required(endpoint, method)
 */
export function buildPaymentRequired(
  endpoint: string,
  method: string,
  planId: string,
  agentId: string,
  creditsRequired: number
): X402PaymentRequired {
  return {
    scheme: "x402",
    network: "nevermined-sandbox",
    planId,
    agentId,
    endpoint,
    method,
    creditsRequired,
    subscribeUrl: `https://nevermined.app/en/subscription/${planId}`,
  };
}

/**
 * Verify an incoming x402 access token.
 * In production: nvm_manager.verify_token(x402_token, endpoint, http_verb, max_credits)
 *
 * Token format: nvm_x402_{timestamp}_{random}
 * We accept any token matching this pattern as valid (sandbox mode).
 */
export function verifyX402Token(
  token: string | undefined,
  endpoint: string,
  creditsRequired: number
): X402VerifyResult {
  if (!token) {
    return { valid: false, reason: "No payment-signature header provided" };
  }

  // Sandbox: accept any token matching our format
  const isValidFormat = /^nvm_x402_\d+_[a-z0-9]+$/.test(token);
  if (!isValidFormat) {
    return { valid: false, reason: "Invalid token format — expected Nevermined x402 access token" };
  }

  // Extract pseudo plan info from token
  const parts = token.split("_");
  const timestamp = parseInt(parts[2] ?? "0");
  const age = Date.now() - timestamp;

  // Tokens expire after 1 hour (sandbox: 24h)
  if (age > 24 * 60 * 60 * 1000) {
    return { valid: false, reason: "Token expired" };
  }

  return {
    valid: true,
    userId: `user_${parts[3]}`,
    planId: `plan_sandbox_${parts[3]}`,
    creditsAvailable: 1000 - creditsRequired,
  };
}

/**
 * Settle credits after successful service delivery.
 * In production: nvm_manager.settle_token(x402_token, endpoint, http_verb, max_credits)
 */
export async function settleX402Token(
  token: string,
  endpoint: string,
  creditsUsed: number
): Promise<{ settled: boolean; txId: string; creditsSettled: number }> {
  // Sandbox: always succeeds
  const txId = `nvm_settle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[NVM] Settled ${creditsUsed} credits for token ${token.slice(0, 20)}... → txId: ${txId}`);
  return { settled: true, txId, creditsSettled: creditsUsed };
}

/**
 * Generate an x402 access token for a plan (consumer side).
 * In production: payments.x402.get_x402_access_token(plan_id, agent_id)
 */
export function generateX402AccessToken(planId: string, agentId: string): string {
  return `nvm_x402_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Order a Nevermined plan (consumer side — first step of buy flow).
 * In production: payments.plans.order_plan(plan_id)
 */
export async function orderNvmPlan(planId: string): Promise<{ success: boolean; orderId: string }> {
  const orderId = `nvm_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[NVM] Ordered plan ${planId} → orderId: ${orderId}`);
  return { success: true, orderId };
}
