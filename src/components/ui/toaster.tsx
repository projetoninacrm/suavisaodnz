import { useToastQueue } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToastQueue();

  return (
    <ToastPortal>
      <ToastViewport>
        {toasts.map((item) => (
          <Toast key={item.id} toast={item}>
            <ToastContent>
              {item.title && <ToastTitle>{item.title}</ToastTitle>}
              {item.description && <ToastDescription>{item.description}</ToastDescription>}
            </ToastContent>
            {item.data?.action}
            <ToastClose aria-label="Fechar aviso" />
          </Toast>
        ))}
      </ToastViewport>
    </ToastPortal>
  );
}
