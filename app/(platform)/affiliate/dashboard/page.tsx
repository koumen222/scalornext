import { redirect } from 'next/navigation';

// L'affiliation est intégrée au compte Scalor (sidebar → Affiliation).
// L'ancien portail affilié séparé est retiré ; cette URL redirige pour
// préserver les liens et favoris existants.
export default function Page() {
  redirect('/ecom/affiliation');
}
