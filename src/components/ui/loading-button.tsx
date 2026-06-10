import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = ButtonProps & { loading?: boolean };

export const LoadingButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ loading, disabled, children, className, ...rest }, ref) => (
    <Button
      ref={ref}
      disabled={disabled || loading}
      className={cn(className)}
      {...rest}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  ),
);
LoadingButton.displayName = "LoadingButton";
