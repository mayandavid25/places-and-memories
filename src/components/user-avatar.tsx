import { useSignedUrl } from "@/hooks/use-signed-url";
import { initials, avatarColor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const url = useSignedUrl(src ?? null);
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.65rem] font-medium uppercase text-foreground/80", className)}
      style={{ width: size, height: size, background: url ? undefined : avatarColor(name) }}
    >
      {url ? (
        <img src={url} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
