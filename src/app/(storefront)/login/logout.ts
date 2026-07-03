"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CUSTOMER_SESSION_COOKIE,
  destroyCustomerSession,
} from "@/lib/customer-session";

export async function logout(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (sessionId) {
    await destroyCustomerSession(sessionId);
  }
  store.delete(CUSTOMER_SESSION_COOKIE);
  redirect("/");
}
