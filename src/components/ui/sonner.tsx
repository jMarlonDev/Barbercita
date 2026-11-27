import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import type { ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{
        "--normal-bg": "var(--card)",
        "--normal-text": "var(--card-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius-lg)",
      } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 4px 24px -4px rgba(15,15,15,0.08), 0 1px 3px -1px rgba(15,15,15,0.06)",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }