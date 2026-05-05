import { Injectable } from "@nestjs/common";
import { createId, database, type BillingRulesRecord } from "../../common/mock-data";

export type UpdateBillingRulesPayload = {
  membershipPlans: Array<{
    id?: string;
    membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
    title: string;
    amountYuan: number;
    pointsBonus: number;
    description: string;
  }>;
  pointsPackages: Array<{
    id?: string;
    title: string;
    pointsAmount: number;
    amountYuan: number;
    description: string;
  }>;
};

@Injectable()
export class BillingRulesService {
  getRules(): BillingRulesRecord {
    return structuredClone(database.billingRules);
  }

  updateRules(payload: UpdateBillingRulesPayload): BillingRulesRecord {
    database.billingRules = {
      membershipPlans: payload.membershipPlans.map((item) => ({
        ...item,
        id: item.id || createId("plan"),
      })),
      pointsPackages: payload.pointsPackages.map((item) => ({
        ...item,
        id: item.id || createId("pkg"),
      })),
    };

    return this.getRules();
  }
}
