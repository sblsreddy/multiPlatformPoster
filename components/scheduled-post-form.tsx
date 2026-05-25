"use client";

import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const platformOptions = ["facebook", "instagram", "linkedin", "tiktok", "x"] as const;

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  message: z.string().min(10, "Message should be more descriptive"),
  location: z.string().min(2, "Location is required"),
  timezone: z.string().min(3, "Timezone is required"),
  scheduledAt: z.string().min(1, "Scheduled date and time are required"),
  platforms: z.array(z.enum(platformOptions)).min(1, "Select at least one platform"),
});

type FormValues = z.infer<typeof formSchema>;
type SaveMode = "draft" | "scheduled";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

export function ScheduledPostForm() {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [saveMode, setSaveMode] = useState<SaveMode>("scheduled");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const defaultValues = useMemo<FormValues>(
    () => ({
      title: "Spring campaign launch",
      message: "Promote the upcoming community event and invite local customers to RSVP.",
      location: "Austin, TX",
      timezone: "America/Chicago",
      scheduledAt: "2026-06-15T09:00",
      platforms: ["facebook", "instagram", "linkedin"],
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const uploadMedia = async (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to upload media.");
    }

    return payload;
  };

  const createPost = async (values: FormValues, mediaAssetId: string | null) => {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: values.title,
        message: values.message,
        location: values.location,
        timezone: values.timezone,
        scheduledAt: values.scheduledAt,
        selectedPlatforms: values.platforms,
        status: saveMode,
        mediaAssetId,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to save scheduled post.");
    }

    return payload;
  };

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);

    try {
      let mediaAssetId: string | null = null;

      if (selectedFile) {
        const uploadResponse = await uploadMedia(selectedFile);
        mediaAssetId = uploadResponse.assetId;
      }

      const postResponse = await createPost(values, mediaAssetId);

      setFeedback({
        type: "success",
        message:
          postResponse.message ||
          (saveMode === "scheduled"
            ? "Scheduled post saved and webhook dispatch was requested."
            : "Draft saved successfully."),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unexpected error while saving post.",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);

    if (file && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    setPreviewUrl(null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-100">
          Post title
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
            placeholder="Example: Weekly product spotlight"
            {...register("title")}
          />
          {errors.title && <p className="mt-2 text-sm text-rose-300">{errors.title.message}</p>}
        </label>

        <label className="block text-sm font-medium text-slate-100">
          Location / area
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
            placeholder="Example: San Diego metro"
            {...register("location")}
          />
          {errors.location && <p className="mt-2 text-sm text-rose-300">{errors.location.message}</p>}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-100">
          Timezone
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
            placeholder="America/New_York"
            {...register("timezone")}
          />
          {errors.timezone && <p className="mt-2 text-sm text-rose-300">{errors.timezone.message}</p>}
        </label>

        <label className="block text-sm font-medium text-slate-100">
          Scheduled date/time
          <input
            type="datetime-local"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
            {...register("scheduledAt")}
          />
          {errors.scheduledAt && <p className="mt-2 text-sm text-rose-300">{errors.scheduledAt.message}</p>}
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-100">
        Message
        <textarea
          rows={5}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
          placeholder="Describe the campaign, CTA, and creative direction."
          {...register("message")}
        />
        {errors.message && <p className="mt-2 text-sm text-rose-300">{errors.message.message}</p>}
      </label>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="block text-sm font-medium text-slate-100">
          Ad image or video
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
          />
          <p className="mt-2 text-xs text-slate-300">
            The attached image is supported now. Video uploads are prepared for the next lane and will be stored using the same flow.
          </p>
        </label>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          {selectedFile ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-100">Selected file: {selectedFile.name}</p>
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Selected ad preview"
                  width={800}
                  height={450}
                  unoptimized
                  className="max-h-64 w-full rounded-xl object-cover"
                />
              ) : (
                <p className="text-sm text-slate-300">Video uploads will be available once you add the media asset downstream.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-300">No media selected yet. Uploading an image will attach it to the scheduled post immediately.</p>
          )}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-100">Select platforms</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platformOptions.map((platform) => (
            <label key={platform} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100">
              <input
                type="checkbox"
                value={platform}
                className="h-4 w-4 rounded border-white/20 bg-slate-900"
                {...register("platforms")}
              />
              <span className="capitalize">{platform}</span>
            </label>
          ))}
        </div>
        {errors.platforms && <p className="mt-2 text-sm text-rose-300">{errors.platforms.message}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setSaveMode("draft")}
          className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && saveMode === "draft" ? "Saving..." : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setSaveMode("scheduled")}
          className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && saveMode === "scheduled" ? "Scheduling..." : "Save as scheduled"}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-rose-300/60 bg-rose-400/10 text-rose-100"
              : "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </form>
  );
}
