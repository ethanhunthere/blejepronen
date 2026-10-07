import * as React from "react"

import { cn } from "@/lib/utils"

type AsProp<C extends React.ElementType> = {
  as?: C
}

type PolymorphicProps<C extends React.ElementType, Props = object> = Props &
  AsProp<C> &
  Omit<React.ComponentProps<C>, keyof Props | "as">

type CardBaseProps = {
  size?: "default" | "sm"
}

type CardProps<C extends React.ElementType = "div"> = PolymorphicProps<C, CardBaseProps>

function Card<C extends React.ElementType = "div">({
  as,
  className,
  size = "default",
  ...props
}: CardProps<C>) {
  const Component = (as || "div") as React.ElementType
  return (
    <Component
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card @container/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border/80 bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        className
      )}
      {...props}
    />
  )
}

type CardHeaderProps<C extends React.ElementType = "div"> = PolymorphicProps<C>

function CardHeader<C extends React.ElementType = "div">({
  as,
  className,
  ...props
}: CardHeaderProps<C>) {
  const Component = (as || "div") as React.ElementType
  return (
    <Component
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

type CardTitleProps<C extends React.ElementType = "div"> = PolymorphicProps<C>

function CardTitle<C extends React.ElementType = "div">({
  as,
  className,
  ...props
}: CardTitleProps<C>) {
  const Component = (as || "div") as React.ElementType
  return (
    <Component
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

type CardDescriptionProps<C extends React.ElementType = "div"> = PolymorphicProps<C>

function CardDescription<C extends React.ElementType = "div">({
  as,
  className,
  ...props
}: CardDescriptionProps<C>) {
  const Component = (as || "div") as React.ElementType
  return (
    <Component
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

type CardFooterProps<C extends React.ElementType = "div"> = PolymorphicProps<C>

function CardFooter<C extends React.ElementType = "div">({
  as,
  className,
  ...props
}: CardFooterProps<C>) {
  const Component = (as || "div") as React.ElementType
  return (
    <Component
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-border/60 bg-muted/30 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardFooterProps,
}
