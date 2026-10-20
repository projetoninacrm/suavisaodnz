import { useEffect, useRef } from "react";

export function useInlineEditorFocus(isEditing: boolean) {
  const triggerRef = useRef<HTMLElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (!isEditing && shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isEditing]);

  return {
    triggerRef,
    restoreFocusOnClose: () => {
      shouldRestoreFocusRef.current = true;
    },
    clearPendingFocusRestore: () => {
      shouldRestoreFocusRef.current = false;
    },
  };
}
