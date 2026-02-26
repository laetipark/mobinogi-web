---
apply: always
---

# Frontend Patterns (Project / Commit-safe)

Reusable frontend implementation templates.
Use these patterns after reading `frontend-development-guide.md`.

## Component + SCSS Module
```tsx
import styles from "./example-card.module.scss";

type Props = {
  title: string;
  onClick?: () => void;
};

export default function ExampleCard({title, onClick}: Props) {
  return (
    <button className={styles.card} onClick={onClick}>
      {title}
    </button>
  );
}
```

## Service Pattern
```ts
import apiService from "./api";
import type {ApiResponse} from "@/types";

export const exampleService = {
  async list(): Promise<ExampleItem[]> {
    const res = await apiService.get<ApiResponse & {data: ExampleItem[]}>("/api/example");
    if(!res.success){
      throw new Error(res.message || "Failed to load examples");
    }
    return res.data;
  },
};
```

## Hook Pattern
```ts
import {useEffect, useState} from "react";

export function useExampleData() {
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    exampleService.list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return {items, loading};
}
```

## SEO Hook Pattern
```ts
useSeo({
  title: "Page Title",
  description: "Page description for search and sharing.",
  canonicalPath: "/page-path",
});
```
