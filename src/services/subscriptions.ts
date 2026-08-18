import api from "../api/client";
import type { ApiEnvelope, PublicPlanOffering } from "../types";

export async function getPublicPlanOfferings(): Promise<PublicPlanOffering[]> {
  const { data } = await api.get<ApiEnvelope<PublicPlanOffering[]>>(
    "/public/plan-offerings",
  );

  return data.data;
}
