import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  finalTitle?: string;
  finalDescription?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Tem certeza?",
  description = "Confirme para continuar.",
  finalTitle = "Essa ação é irreversível",
  finalDescription = "Deseja realmente continuar?",
  confirmLabel = "Confirmar",
  destructive = true,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const handleOpen = (v: boolean) => {
    if (!v) setStep(1);
    onOpenChange(v);
  };

  const handleFinal = async () => {
    setBusy(true);
    try {
      await onConfirm();
      handleOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpen}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{step === 1 ? title : finalTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1 ? description : finalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          {step === 1 ? (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className={`rounded-xl ${destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            >
              Continuar
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleFinal();
              }}
              className={`rounded-xl ${destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            >
              {busy ? "Processando..." : confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Optional decorative slot for callers that want to render extra content above the dialog actions.
export function ConfirmContent({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
