"use client";

import * as React from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AVATAR_SIZE = 256;

function getCenteredCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height,
  );
}

async function createCroppedAvatar(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not prepare this image.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );

  if (!blob) {
    throw new Error("Your browser could not prepare this image.");
  }

  if (blob.type !== "image/webp") {
    throw new Error("Your browser could not create a WebP profile picture.");
  }

  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function AvatarCropDialog({
  file,
  open,
  onOpenChange,
  onUpload,
  onUploadError,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  onUploadError?: (error: Error) => void;
}) {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // A new file owns a fresh object URL and crop state; synchronize both when
  // the user replaces the selected source image.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!file) {
      setSourceUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError(null);

    return () => URL.revokeObjectURL(url);
  }, [file]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(nextOpen);
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const centeredCrop = getCenteredCrop(
      image.naturalWidth,
      image.naturalHeight,
    );
    setCrop(centeredCrop);
    if (centeredCrop.unit === "%") {
      setCompletedCrop({
        unit: "px",
        x: (centeredCrop.x * image.width) / 100,
        y: (centeredCrop.y * image.height) / 100,
        width: (centeredCrop.width * image.width) / 100,
        height: (centeredCrop.height * image.height) / 100,
      });
    }
    setError(null);
  };

  const handleImageError = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError("We couldn't read this image. Choose a valid JPEG, PNG, or WebP.");
  };

  const handleUpload = async () => {
    if (!imageRef.current || !completedCrop?.width || !completedCrop.height) {
      setError("Select the part of the image you want to use.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const croppedFile = await createCroppedAvatar(
        imageRef.current,
        completedCrop,
      );
      await onUpload(croppedFile);
    } catch (uploadError) {
      const normalizedError =
        uploadError instanceof Error
          ? uploadError
          : new Error("Unable to upload this profile picture.");
      setError(normalizedError.message);
      onUploadError?.(normalizedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose your profile picture</DialogTitle>
          <DialogDescription>
            Drag the square to choose what stays in your picture. It will be
            saved at 256×256.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-64 overflow-hidden rounded-md border border-line bg-ink/5 p-3">
          {sourceUrl ? (
            <ReactCrop
              crop={crop}
              aspect={1}
              circularCrop
              keepSelection
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
              className="mx-auto max-h-[52svh]"
            >
              {/* The cropper needs a native blob-backed image element. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Profile picture crop preview"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="block max-h-[52svh] w-auto max-w-full object-contain"
              />
            </ReactCrop>
          ) : (
            <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
              Preparing image preview…
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP. Maximum 5 MB.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !completedCrop || Boolean(error)}
            onClick={() => void handleUpload()}
          >
            {isSubmitting ? "Uploading…" : "Upload photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
