"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

interface CopyLinkMenuItemProps {
    jobUrl: string;
}

export function CopyLinkMenuItem({ jobUrl }: CopyLinkMenuItemProps) {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(jobUrl);
            toast.success("Url copiée dans le presse-papiers");
        } catch (err) {
            console.error("Impossible de copier le texte: ", err);
            toast.error("Impossible de copier l'URL");
        }
    };

    return (
      <DropdownMenuItem onSelect={handleCopy}>
        <Link2 className=" h-4 w-4" />
        <span>Copy Job URL</span>
      </DropdownMenuItem>  
    );
}