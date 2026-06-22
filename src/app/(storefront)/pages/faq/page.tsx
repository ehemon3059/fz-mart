import { listActiveFaqs } from "@/server/faq";

export default async function FaqPage() {
  const faqs = await listActiveFaqs();

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id}>
            <h2 className="font-semibold text-gray-900">{faq.question}</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
