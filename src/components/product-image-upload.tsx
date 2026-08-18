import { ImagePlus } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import { setProductImage } from "@/lib/admin.functions";
import { uploadProductImage } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

export function ProductImageUpload({
  onComplete,
  productId,
  productName,
}: {
  onComplete: () => Promise<void>;
  productId: string;
  productName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const objectKey = await uploadProductImage(file);

      await setProductImage({
        data: { alt: productName, objectKey, productId },
      });
      await onComplete();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to save the uploaded image"
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        accept="image/*"
        aria-invalid={Boolean(error)}
        aria-label={`Select image for ${productName}`}
        className="sr-only"
        disabled={isUploading}
        id={`image-${productId}`}
        onChange={chooseFile}
        ref={inputRef}
        type="file"
      />
      <Button
        aria-busy={isUploading}
        aria-label={`Upload image for ${productName}`}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        size="icon"
        title={`Upload image for ${productName}`}
        type="button"
        variant="outline"
      >
        <span className="relative size-4">
          <ImagePlus
            aria-hidden="true"
            className={cn(
              "absolute inset-0 transition-[filter,opacity,transform] duration-150 ease-out-strong",
              isUploading
                ? "scale-[0.25] opacity-0 blur-[4px]"
                : "scale-100 opacity-100 blur-0"
            )}
          />
          <Spinner
            aria-hidden="true"
            aria-label={undefined}
            className={cn(
              "absolute inset-0 transition-[filter,opacity,transform] duration-150 ease-out-strong",
              isUploading
                ? "scale-100 opacity-100 blur-0"
                : "scale-[0.25] opacity-0 blur-[4px]"
            )}
            role="presentation"
          />
        </span>
      </Button>
      {error ? (
        <span
          className="max-w-32 text-right text-destructive text-xs"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
