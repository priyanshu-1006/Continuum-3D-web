import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDetails from "@/components/EventDetails";
import { events, getEvent } from "@/lib/events";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: `${event.shortDescription} ${event.dateLabel} · ${event.venue}.`,
    openGraph: {
      title: `${event.title} — CONTINUUM 2027`,
      description: event.shortDescription,
      images: [{ url: event.poster, alt: `${event.title} event artwork` }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${event.title} | CONTINUUM 2027`, description: event.shortDescription, images: [event.poster] },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();
  return <EventDetails event={event} />;
}
