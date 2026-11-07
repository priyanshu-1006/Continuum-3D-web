import { notFound } from "next/navigation";
import EventModal from "@/components/EventModal";
import { getEvent } from "@/lib/events";

export default async function EventModalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();
  return <EventModal event={event} />;
}
