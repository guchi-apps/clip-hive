import { Badge } from "@/components/ui/badge";
import type { TagDTO } from "@/types";

export function TagBadge({ tag }: { tag: TagDTO }) {
  return <Badge variant="secondary">{tag.name}</Badge>;
}
