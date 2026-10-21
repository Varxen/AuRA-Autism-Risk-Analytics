import { useLayoutEffect, useRef } from "react";

export function useOnboardingScale() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    const main = mainRef.current;
    if (!workspace || !main) return;

    function fit() {
      if (!workspace || !main || !main.offsetHeight || !main.offsetWidth) return;
      // Measure untransformed layout dimensions to avoid scaling feedback loops.
      const scale = Math.min(
        1,
        workspace.clientHeight / main.offsetHeight,
        workspace.clientWidth / main.offsetWidth,
      );
      main.style.setProperty("--onboarding-scale", String(scale));
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(workspace);
    observer.observe(main);
    return () => observer.disconnect();
  }, []);

  return { workspaceRef, mainRef };
}
