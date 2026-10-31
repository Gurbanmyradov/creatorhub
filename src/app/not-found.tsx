import Link from "next/link";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <Empty title="Page not found">
      <Link href="/">Back to the dashboard</Link>
    </Empty>
  );
}
