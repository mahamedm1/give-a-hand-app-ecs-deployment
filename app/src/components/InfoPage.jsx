/** Simple layout for text pages (privacy, terms, FAQ, contact). */
function InfoPage({ title, updated, children }) {
  return (
    <div className="container mx-auto px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 text-gray-700 leading-relaxed space-y-4
        [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-orange-600 [&_a:hover]:underline">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {updated && <p className="text-sm text-gray-500">Last updated: {updated}</p>}
        {children}
      </article>
    </div>
  );
}

export default InfoPage;
