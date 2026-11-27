"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "@gravity-ui/icons"

interface StepperContextValue {
  value: number
  onValueChange: (value: number) => void
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepperContext() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("Stepper components must be used within a Stepper")
  }
  return context
}

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
        className={cn("flex w-full items-start", className)}
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
      className={cn("flex flex-1 items-start gap-2 last:flex-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface StepperTriggerProps extends React.ComponentProps<"button"> {
  index: number
  label: string
  description?: string
}

export function StepperTrigger({
  children,
  className,
  index,
  label,
  description,
  ...props
}: StepperTriggerProps) {
  const { value, onValueChange } = useStepperContext()
  const isActive = index === value
  const isComplete = index < value

  return (
    <button
      type="button"
      data-slot="stepper-trigger"
      data-active={isActive}
      data-complete={isComplete}
      onClick={() => onValueChange(index)}
      className={cn(
        "group flex items-start gap-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 shrink-0">
        <span
          className={cn(
            "step-circle relative flex size-10 shrink-0 items-center justify-center rounded-full font-body font-medium text-sm transition-all duration-200",
            isComplete && "step-circle-complete",
            isActive && "step-circle-active",
            !isActive && !isComplete && "step-circle-inactive"
          )}
        >
          {isComplete ? <Check className="size-4" /> : index + 1}
          {isActive && !isComplete && (
            <span className="absolute inset-0 rounded-full ring-4 ring-primary-soft" />
          )}
        </span>
        <div className="hidden sm:block text-center w-32">
          <p className={cn(
            "font-body font-medium text-xs transition-colors",
            isActive ? "text-primary" : "text-muted-foreground"
          )}>
            {label}
          </p>
          {description && (
            <p className="font-body text-[0.7rem] text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

export function StepperSeparator({
  className,
  isComplete,
  ...props
}: React.ComponentProps<"div"> & { isComplete?: boolean }) {
  return (
    <div
      data-slot="stepper-separator"
      className={cn(
        "relative mt-5 h-0.5 min-w-4 flex-1 transition-colors",
        isComplete ? "bg-primary" : "bg-border",
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
      className={cn("animate-in fade-in-200", className)}
      {...props}
    >
      {children}
    </div>
  )
}
