import { Icon, type IconName } from "@/components/icons";
import { ButtonLink } from "./Button";

/** Empty state: icon + one-line explanation + an inviting primary action.
 *  "No delivered sales yet" should point somewhere, not just state a fact. */
export function EmptyState({
  icon = "box",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; href: string; icon?: IconName };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-400 shadow-card">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 text-sm font-semibold text-stone-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && (
        <ButtonLink href={action.href} icon={action.icon} size="sm" className="mt-4">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
