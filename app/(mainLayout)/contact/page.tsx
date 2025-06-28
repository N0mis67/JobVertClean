import { ContactForm } from "@/components/general/ContactForm"; // Chemin à adapter si nécessaire

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contactez-nous</h1>
      <ContactForm />
    </main>
  );
}
