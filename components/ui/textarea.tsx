import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-inner transition-colors outline-none resize-none",
        "placeholder:text-muted-foreground/70 selection:bg-brand selection:text-brand-foreground",
        "hover:border-muted-foreground/30",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
