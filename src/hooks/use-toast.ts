import * as React from "react";
import { Toast } from "@base-ui/react/toast";

export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

interface ToastData {
  variant: ToastVariant;
  action?: React.ReactNode;
}

type ToastHandle = {
  id: string;
  dismiss: () => void;
  update: (options: Partial<ToastOptions>) => void;
};

type ToastFunction = ((options: ToastOptions) => ToastHandle) & {
  success: (message: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) => ToastHandle;
  error: (message: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) => ToastHandle;
};

export const toastManager = Toast.createToastManager<ToastData>();

function addToast(options: ToastOptions): ToastHandle {
  const variant = options.variant ?? "default";
  const id = toastManager.add({
    title: options.title,
    description: options.description,
    type: variant,
    priority: variant === "destructive" ? "high" : "low",
    timeout: options.duration,
    data: { variant, action: options.action },
  });

  return {
    id,
    dismiss: () => toastManager.close(id),
    update: (nextOptions) => {
      toastManager.update(id, (current) => {
        const nextVariant = nextOptions.variant ?? current.data?.variant ?? "default";
        return {
          title: nextOptions.title ?? current.title,
          description: nextOptions.description ?? current.description,
          type: nextVariant,
          priority: nextVariant === "destructive" ? "high" : "low",
          timeout: nextOptions.duration ?? current.timeout,
          data: {
            variant: nextVariant,
            action: nextOptions.action ?? current.data?.action,
          },
        };
      });
    },
  };
}

export const toast: ToastFunction = Object.assign(addToast, {
  success: (message: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
    addToast({ ...options, title: message }),
  error: (message: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
    addToast({ ...options, title: message, variant: "destructive" }),
});

export function useToast() {
  return {
    toast,
    dismiss: (id?: string) => toastManager.close(id),
  };
}

export function useToastQueue() {
  return Toast.useToastManager<ToastData>();
}
