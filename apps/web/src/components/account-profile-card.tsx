import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { UserAvatar } from "@/components/user-avatar";
import {
  uploadAvatar,
  removeAvatar,
  type CurrentUserResponse,
} from "@/lib/auth-api";
import { PencilIcon, Trash2Icon, UploadIcon, Loader2Icon } from "lucide-react";

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function canDecodeAvatar(file: File): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return true;
    } catch {
      return false;
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AccountProfileCard({
  user,
  onAvatarChanged,
}: {
  user: CurrentUserResponse["user"];
  onAvatarChanged?: (avatarUrl: string | null) => void;
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [cropFile, setCropFile] = React.useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = React.useState(false);
  const normalizedUserAvatarUrl = user.avatarUrl ?? undefined;
  const [localAvatarUrl, setLocalAvatarUrl] = React.useState<
    string | undefined
  >(normalizedUserAvatarUrl);
  const [prevUserAvatarUrl, setPrevUserAvatarUrl] = React.useState<
    string | undefined
  >(normalizedUserAvatarUrl);

  if (normalizedUserAvatarUrl !== prevUserAvatarUrl) {
    setLocalAvatarUrl(normalizedUserAvatarUrl);
    setPrevUserAvatarUrl(normalizedUserAvatarUrl);
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error("Choose an image smaller than 5 MB.");
    } else if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are supported.");
    } else if (!(await canDecodeAvatar(file))) {
      toast.error("We couldn't read this image. Choose a valid JPEG, PNG, or WebP.");
    } else {
      setCropFile(file);
      setIsCropOpen(true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCroppedUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const response = await uploadAvatar(file);
      setLocalAvatarUrl(response.avatarUrl || undefined);
      onAvatarChanged?.(response.avatarUrl);
      setIsCropOpen(false);
      setCropFile(null);
      toast.success("Profile picture updated successfully.");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsUploading(true);
      await removeAvatar();
      setLocalAvatarUrl(undefined);
      onAvatarChanged?.(null);
      toast.success("Profile picture removed successfully.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove profile picture.",
      );
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
            <UserAvatar
              name={user.displayName}
              email={user.email}
              avatarUrl={localAvatarUrl}
              size="lg"
            />
            <div className="flex flex-col gap-1">
              <p className="font-medium">Profile picture</p>
              <p className="text-muted-foreground">
                JPEG, PNG, or WebP up to 5 MB. Cropped and optimized to 256×256.
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
                {isUploading ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <PencilIcon />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  render={
                    <label
                      htmlFor="avatar-upload"
                      className="flex w-full cursor-pointer items-center"
                    />
                  }
                >
                  <UploadIcon className="mr-2 size-4" />
                  Upload
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!localAvatarUrl}
                  render={
                    <div
                      onClick={handleRemove}
                      className="flex w-full cursor-pointer items-center text-left"
                    />
                  }
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
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="account-first-name">First name</FieldLabel>
              <Input id="account-first-name" value={user.firstName} disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-last-name">Last name</FieldLabel>
              <Input id="account-last-name" value={user.lastName} disabled />
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
      <AvatarCropDialog
        file={cropFile}
        open={isCropOpen}
        onOpenChange={(open) => {
          setIsCropOpen(open);
          if (!open && !isUploading) {
            setCropFile(null);
          }
        }}
        onUpload={handleCroppedUpload}
        onUploadError={(error) => toast.error(error.message)}
      />
    </Card>
  );
}
