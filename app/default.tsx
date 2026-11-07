import { notFound } from 'next/navigation';

/** Keep the children slot explicit for URLs matched by the modal catch-all. */
export default function DefaultPage() {
  notFound();
}
