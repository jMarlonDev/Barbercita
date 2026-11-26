"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const StepperContext = React.createContext<{
  value: number
  onValueChange: (value: number) => void
} | null>(null)

export function Stepper({
  value,
  onValueChange,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  value: number
  onValueChange: (value: number) => void
}) {
  return (
    <StepperContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="stepper"
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

export function StepperItem({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-item"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function StepperTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="stepper-trigger"
      className={cn(
        "group flex items-center gap-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function StepperSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-separator"
      className={cn(
        "relative flex-1 h-0.5 bg-border",
        className
      )}
      {...props}
    />
  )
}

export function StepperContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-content"
      className={cn("animate-in fade-in-0", className)}
      {...props}
    >
      {children}
    </div>
  )
}