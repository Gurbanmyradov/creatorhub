import type { Metadata } from "next";
import { CreatorForm } from "@/components/CreatorForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add creator" };

export default function NewCreator() {
  return (
    <>
      <PageHeader
        title="Add creator"
        subtitle="Contact details and the platforms they publish on."
      />
      <CreatorForm />
    </>
  );
}
