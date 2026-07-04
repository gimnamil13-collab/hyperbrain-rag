import { toast } from "sonner";

export const notify = {
  success: (msg: string) =>
    toast.success(msg, { description: "HYPERBRAIN · OK" }),
  error: (msg: string) =>
    toast.error(msg, { description: "HYPERBRAIN · ERROR" }),
  info: (msg: string) =>
    toast.info(msg, { description: "HYPERBRAIN · INFO" }),
  loading: (msg: string) => toast.loading(msg),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
