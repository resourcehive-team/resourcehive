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
import { Input } from "@/components/ui/input";

export function AccountProfileCard() {
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
              <AvatarImage alt="Account profile" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Profile picture</p>
              <p className="text-muted-foreground">
                Profile image editing will be available later.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="account-first-name">First name</FieldLabel>
              <Input
                id="account-first-name"
                placeholder="Your first name"
                disabled
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-last-name">Last name</FieldLabel>
              <Input
                id="account-last-name"
                placeholder="Your last name"
                disabled
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="account-email">Email address</FieldLabel>
            <Input
              id="account-email"
              type="email"
              placeholder="Your verified organization email"
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
