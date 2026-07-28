import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { getProfile } from "@/server/customers/profile";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "My Profile — FZ Mart", robots: { index: false } };

export default async function ProfilePage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/profile");

  const profile = await getProfile(session.customerId);
  if (!profile) redirect("/login?next=/account/profile");

  return (
    <ProfileForm
      customerId={profile.id}
      loginEmail={profile.email}
      provider={profile.provider}
      initial={{
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        contactEmail: profile.contactEmail ?? "",
      }}
    />
  );
}
