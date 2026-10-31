import type { Metadata } from "next";
import { CampaignForm } from "@/components/CampaignForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New campaign" };

export default function NewCampaign() {
  return (
    <>
      <PageHeader
        title="New campaign"
        subtitle="Set the budget and timeline, then assign creators."
      />
      <CampaignForm />
    </>
  );
}
