import type { Member } from "../types";

export function Avatar({
  member,
  size = "md",
  avatarUrl,
}: {
  member: Member | { initials: string; color: string };
  size?: "sm" | "md" | "lg";
  avatarUrl?: string;
}) {
  const source =
    avatarUrl ?? ("profile" in member ? member.profile.avatarUrl : undefined);
  return source ? (
    <img
      className={`avatar avatar-${size}`}
      src={source}
      alt={member.initials}
    />
  ) : (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: member.color }}
    >
      {member.initials}
    </span>
  );
}
