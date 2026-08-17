import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { CurrentUserResponse } from "@/lib/auth-api";
import { PencilIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function AccountProfileCard({
  user,
}: {
  user: CurrentUserResponse["user"];
}) {
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((name) => name[0]?.toUpperCase())
      .join("") || "RU";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
        <CardDescription>
          The basic information associated with your ResourceHive account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage alt={`${user.displayName} profile`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <p className="font-medium">Profile picture</p>
              <p className="text-muted-foreground">
                Manage your profile picture.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Manage profile picture"
                  />
                }
              >
                <PencilIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>
                  <UploadIcon />
                  Upload
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash2Icon />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="account-first-name">First name</FieldLabel>
              <Input
                id="account-first-name"
                value={user.firstName}
                disabled
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-last-name">Last name</FieldLabel>
              <Input
                id="account-last-name"
                value={user.lastName}
                disabled
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="account-email">Email address</FieldLabel>
            <Input
              id="account-email"
              type="email"
              value={user.email}
              disabled
            />
            <FieldDescription>
              Your organization email is used to identify your account.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button disabled>Save changes</Button>
      </CardFooter>
    </Card>
  );
}
