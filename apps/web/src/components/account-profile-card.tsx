import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { uploadAvatar, removeAvatar, type CurrentUserResponse } from "@/lib/auth-api";
import { PencilIcon, Trash2Icon, UploadIcon, Loader2Icon } from "lucide-react";

export function AccountProfileCard({
  user,
}: {
  user: CurrentUserResponse["user"];
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = React.useState<string | undefined>(user.avatarUrl);

  React.useEffect(() => {
    setLocalAvatarUrl(user.avatarUrl);
  }, [user.avatarUrl]);

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((name) => name[0]?.toUpperCase())
      .join("") || "RU";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const response = await uploadAvatar(file);
      setLocalAvatarUrl(response.avatarUrl || undefined);
      toast.success("Profile picture updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload profile picture.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    try {
      setIsUploading(true);
      await removeAvatar();
      setLocalAvatarUrl(undefined);
      toast.success("Profile picture removed successfully.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove profile picture.");
    } finally {
      setIsUploading(false);
    }
  };

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
              <AvatarImage src={localAvatarUrl} alt={`${user.displayName} profile`} />
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
                disabled={isUploading}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Manage profile picture"
                  />
                }
              >
                {isUploading ? <Loader2Icon className="animate-spin" /> : <PencilIcon />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  render={<label htmlFor="avatar-upload" className="flex w-full cursor-pointer items-center" />}
                >
                  <UploadIcon className="mr-2 size-4" />
                  Upload
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!localAvatarUrl}
                  render={<div onClick={handleRemove} className="flex w-full cursor-pointer items-center text-left" />}
                >
                  <Trash2Icon className="mr-2 size-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Hidden file input */}
            <input
              id="avatar-upload"
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
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
