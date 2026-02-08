import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  clear: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(
  undefined,
);

interface BreadcrumbProviderProps {
  children: ReactNode;
}

export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const location = useLocation();
  const [items, setItemsState] = useState<BreadcrumbItem[]>([]);
  const [itemsPath, setItemsPath] = useState<string | null>(null);

  const setItems = useCallback(
    (nextItems: BreadcrumbItem[]) => {
      setItemsState(nextItems);
      setItemsPath(location.pathname);
    },
    [location.pathname],
  );

  const clear = useCallback(() => {
    setItemsState([]);
    setItemsPath(null);
  }, []);

  useEffect(() => {
    if (itemsPath && itemsPath !== location.pathname) {
      setItemsState([]);
      setItemsPath(null);
    }
  }, [itemsPath, location.pathname]);

  const value = useMemo(
    () => ({
      items,
      setItems,
      clear,
    }),
    [items, setItems, clear],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumbs must be used within a BreadcrumbProvider");
  }
  return context;
}
