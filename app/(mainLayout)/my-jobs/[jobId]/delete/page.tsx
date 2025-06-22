import { deleteJobPost } from "@/app/actions";
import { GeneralSubmitButton } from "@/components/general/SubmitButtons";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2Icon, ArrowLeftIcon } from "lucide-react";

import Link from "next/link";
import React from "react";

type Params = Promise<{ jobId: string }>;

const DeleteJobPage = async ({ params }: { params: Params }) => {
  const { jobId } = await params;
  return (
    <Card className="max-w-lg mx-auto w-full">
      <CardHeader>
        <CardTitle>Es-tu vraiment sûr?</CardTitle>
        <CardDescription>
        Cette action est irréversible. Votre compte sera définitivement supprimé et vos données seront supprimées de nos serveurs
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end gap-4">
        <Link
          href={`/my-jobs`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeftIcon className="size-4" />
          Annuler
        </Link>
        <form
          action={async () => {
            "use server";
            await deleteJobPost(jobId);
          }}
        >
          <GeneralSubmitButton
            text="Delete Job"
            variant="destructive"
            icon={<Trash2Icon className="size-4" />}
          />
        </form>
      </CardFooter>
    </Card>
  );
};

export default DeleteJobPage;