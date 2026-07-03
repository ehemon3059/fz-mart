import { notFound } from "next/navigation";
import { getCartByToken, markCartRecovered } from "@/server/cart";
import type { SavedCartItem } from "@/server/cart";
import RestoreCart from "./RestoreCart";

// Landing page for the abandoned-cart recovery link. Loads the saved cart,
// records the recovery (attribution), and hands the items to a client
// component that repopulates the localStorage cart and forwards to /cart.
export default async function RestoreCartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cart = await getCartByToken(token);
  if (!cart) notFound();

  await markCartRecovered(token);
  const items = cart.items as unknown as SavedCartItem[];

  return <RestoreCart items={items} />;
}
