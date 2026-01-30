import * as React from "react";

export function Collapsible({ open, onOpenChange, children }) {
  return (
    <div>
      {React.Children.map(children, child =>
        React.cloneElement(child, { open, onOpenChange })
      )}
    </div>
  );
}

export function CollapsibleTrigger({ open, onOpenChange, children }) {
  return (
    <div onClick={() => onOpenChange(!open)}>
      {children}
    </div>
  );
}

export function CollapsibleContent({ open, children }) {
  if (!open) return null;
  return <div>{children}</div>;
}
