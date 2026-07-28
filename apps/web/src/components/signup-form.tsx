"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Use the email address provided by your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Institutional email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.edu"
                  autoComplete="email"
                  required
                />
                <FieldDescription>
                  This must match a domain configured by your organization.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <FieldDescription>
                  Use at least 8 characters with a letter, number, and special
                  character.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              <Field>
                <Button type="submit">Create account</Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Log in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
