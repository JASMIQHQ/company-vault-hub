import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-white/70 group-[.toaster]:!text-foreground group-[.toaster]:!border-white/70 group-[.toaster]:shadow-[0_18px_50px_-18px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] group-[.toaster]:backdrop-blur-2xl group-[.toaster]:backdrop-saturate-150 dark:group-[.toaster]:!bg-slate-950/70 dark:group-[.toaster]:!border-white/10 dark:group-[.toaster]:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
