import { z } from "zod";

export const orderSchema = z.object({
  eventId: z.string().uuid(),
  buyerName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom est trop long")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom contient des caractères non autorisés"),
  buyerEmail: z.string().email("Email invalide"),
  buyerPhone: z
    .string()
    .regex(
      /^(\+229\d{8}|\d{8,15})$/,
      "Numéro de téléphone invalide (format: +229XXXXXXXX ou 8 à 15 chiffres)"
    ),
  momoTransactionId: z
    .string()
    .min(8, "L'ID de transaction MoMo doit contenir au moins 8 caractères")
    .max(14, "L'ID de transaction MoMo ne peut dépasser 14 caractères")
    .regex(
      /^[A-Za-z0-9]{8,14}$/,
      "L'ID de transaction MoMo doit être une chaîne alphanumérique de 8 à 14 caractères"
    ),
  items: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        quantity: z.number().int().positive("La quantité doit être positive"),
      })
    )
    .min(1, "Sélectionnez au moins un ticket"),
});

export const eventSchema = z.object({
  title: z
    .string()
    .min(2, "Le titre doit contenir au moins 2 caractères")
    .max(200, "Le titre est trop long"),
  description: z.string().max(5000, "La description est trop longue").default(""),
  date: z.string().min(1, "La date est requise"),
  location: z
    .string()
    .min(2, "Le lieu doit contenir au moins 2 caractères")
    .max(200, "Le lieu est trop long"),
  coverImage: z.string().default(""),
  categories: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, "Le nom de la catégorie est requis")
          .max(100, "Le nom de la catégorie est trop long"),
        price: z
          .number()
          .int("Le prix doit être un nombre entier")
          .positive("Le prix doit être positif"),
      })
    )
    .min(1, "Ajoutez au moins une catégorie"),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type EventInput = z.infer<typeof eventSchema>;
