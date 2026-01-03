import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      {/* ... autres éléments */}
      <p>
        <Link href="/contact" className="hover:underline">
          Contact
        </Link>
        {" | "}
        <Link href="/mentions-legales" className="hover:underline">
          Mentions légales
        </Link>
        {" | "}
        <Link href="/cgu" className="hover:underline">
          Conditions Générales d&apos;Utilisation
        </Link>
        {" | "}
        <Link href="/pdc" className="hover:underline">
          Politique de confidentialité
        </Link>
      </p>
      <p className="mt-2 text-muted-foreground">&copy; 2025 JobVert. Tous droits réservés.</p>
    </footer>
  );
}
