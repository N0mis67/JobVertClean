import { Resend } from "resend";
import { z } from "zod";
import { NextResponse } from "next/server";

// Initialise Resend avec la clé d'API (doit être définie dans .env.local)
const resend = new Resend(process.env.RESEND_API_KEY);

// Schéma de validation Zod
const contactSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Adresse e-mail invalide"),
  message: z.string().min(1, "Le message est requis"),
});

export async function POST(req: Request) {
  try {
    // Vérifie que la requête est bien un POST avec JSON
    const body = await req.json();

    // Valide les données
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Champs invalides", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, message } = parsed.data;

    // Envoi de l’e-mail avec Resend
    const data = await resend.emails.send({
      from: "JobVert Contact <contact@jobvert.fr>",
      to: ["contact@jobvert.fr"],
      subject: `Nouveau message de ${firstName} ${lastName}`,
      replyTo: email,
      text: `
Nom : ${lastName}
Prénom : ${firstName}
Email : ${email}

Message :
${message}
      `.trim(),
    });

    // Résultat succès
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Erreur envoi contact :", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
