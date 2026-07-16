"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const approvedDomains = ["uom.lk", "cse.mrt.ac.lk"]

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [step, setStep] = useState<"details" | "verification">("details")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const institutionalEmail = String(formData.get("email"))
    const password = String(formData.get("password"))
    const confirmPassword = String(formData.get("confirm-password"))
    const domain = institutionalEmail.split("@").at(-1)?.toLowerCase()

    if (!domain || !approvedDomains.includes(domain)) {
      setError("Use an approved university or department email domain.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setEmail(institutionalEmail)
    setError("")
    setStep("verification")
  }

  function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const verificationCode = String(formData.get("verification-code"))

    if (verificationCode !== "123456") {
      setError("Enter the mock verification code 123456.")
      return
    }

    setError("")
    setMessage("Email verified. Account creation is not connected yet.")
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Only approved university or department email domains are accepted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "details" ? (
          <form onSubmit={handleDetailsSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Institutional email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@uom.lk"
                  autoComplete="email"
                  required
                />
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
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button type="submit">Send verification code</Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={handleVerificationSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="verification-code">
                  Verification code
                </FieldLabel>
                <Input
                  id="verification-code"
                  name="verification-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
                <FieldDescription>
                  Enter the code sent to {email}. For this frontend mock, use
                  123456.
                </FieldDescription>
              </Field>
              {error && <FieldError>{error}</FieldError>}
              {message && <FieldDescription>{message}</FieldDescription>}
              <Field>
                <Button type="submit">Verify code</Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
