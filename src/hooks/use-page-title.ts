import { useEffect } from "react";

export function usePageTitle(page: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = page ? `${page} — LanHouse Pro` : "LanHouse Pro";
    return () => {
      document.title = prev;
    };
  }, [page]);
}
