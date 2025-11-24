/* eslint-disable @typescript-eslint/no-explicit-any */
import { World } from "@/lib/objax/runtime/world";
import { useEffect, useMemo, useState } from "react";
import { runtime } from "@/lib/objax/runtime";

export function useWorld({
  init,
  onUpdate,
}: {
  init: World | null;
  onUpdate: ({
    upserts,
    deletes,
  }: {
    upserts: any[];
    deletes: any[];
  }) => Promise<void>;
}) {
  const [, force] = useState(0);
  const rt = useMemo(() => (init ? runtime({ world: init }) : null), [init]);

  useEffect(() => {
    if (!rt) return;
    rt.start({ onUpdate });
    rt?.subscribe(() => {
      force((x) => x + 1);
    });
  }, [rt]);

  return rt;
}
