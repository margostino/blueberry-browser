import { z } from "zod";

export const UUIDSchema = z.string().uuid();

export const URLSchema = z.string().url("Invalid URL format");

export const TimestampSchema = z
  .number()
  .int("Timestamp must be an integer")
  .positive("Timestamp must be positive")
  .refine((val) => val <= Date.now() + 86400000, {
    message: "Timestamp cannot be more than 24 hours in the future",
  });

export const ColorSchema = z
  .string()
  .regex(
    /^(#[0-9A-Fa-f]{3,8}|rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)|rgba\(\d{1,3},\s?\d{1,3},\s?\d{1,3},\s?[01]?\.?\d*\)|[a-z]+)$/i,
    "Invalid color format"
  );

export const CoordinateSchema = z.object({
  x: z.number().finite("Coordinate must be finite"),
  y: z.number().finite("Coordinate must be finite"),
});

export const DimensionsSchema = z.object({
  width: z.number().positive("Width must be positive").finite(),
  height: z.number().positive("Height must be positive").finite(),
});

export const PercentageSchema = z
  .number()
  .min(0, "Percentage must be at least 0")
  .max(100, "Percentage must be at most 100");

export const TagSchema = z
  .string()
  .min(1, "Tag cannot be empty")
  .max(50, "Tag too long")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Tag can only contain letters, numbers, dashes, and underscores"
  );

export const NonEmptyStringSchema = z
  .string()
  .transform((str) => str.trim())
  .pipe(z.string().min(1, "Cannot be empty"));
