import { World } from "@/lib/objax/runtime/world";
import { useEffect, useMemo, useState } from "react";
import { runtime } from "@/lib/objax/runtime";

export function useWorld({ init }: { init: World | null }) {
  const [, force] = useState(0);
  const rt = useMemo(() => (init ? runtime({ world: init }) : null), [init]);

  useEffect(() => {
    if (!rt) return;
    rt.start();
    rt?.subscribe(() => {
      force((x) => x + 1);
    });
  }, [rt]);

  return rt;
}
