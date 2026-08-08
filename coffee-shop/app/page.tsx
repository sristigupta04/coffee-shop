export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffaf3]">

      {/* Welcome */}
      <section className="mx-auto max-w-7xl px-8 py-24 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#a85d25]">
          Welcome to
        </p>

        <h1 className="font-[family-name:var(--font-playfair)] text-6xl font-bold text-[#4b2e1f]">
          Brew & White
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#765642]">
          Discover carefully crafted coffee, refreshing drinks and
          delightful desserts made for every moment.
        </p>

        <a
          href="/menu"
          className="mt-8 inline-block rounded-xl bg-[#8b4a24] px-7 py-3 font-semibold text-white transition hover:bg-[#6f381b]"
        >
          Explore Menu
        </a>
      </section>

      {/* Explore Our Coffee */}
      <section className="mx-auto max-w-7xl px-8 pb-24">

        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#a85d25]">
            Discover
          </p>

          <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#4b2e1f]">
            Explore Our Coffee
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">

          {/* Hot Coffee */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
            <img
              src="/hot.png"
              alt="Hot Coffee"
              className="h-64 w-full object-cover"
            />

            <div className="p-6">
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#4b2e1f]">
                Hot Coffee
              </h3>

              <p className="mt-2 italic text-[#a85d25]">
                Aromas Without End
              </p>
            </div>
          </div>

          {/* Cold Coffee */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
            <img
              src="/cold.png"
              alt="Cold Coffee"
              className="h-64 w-full object-cover"
            />

            <div className="p-6">
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#4b2e1f]">
                Cold Coffee
              </h3>

              <p className="mt-2 italic text-[#a85d25]">
                One Coffee, A Thousand Tastes
              </p>
            </div>
          </div>

          {/* Desserts */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
            <img
              src="/desserts.png"
              alt="Desserts"
              className="h-64 w-full object-cover"
            />

            <div className="p-6">
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#4b2e1f]">
                Desserts
              </h3>

              <p className="mt-2 italic text-[#a85d25]">
                Sweetness Without End
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}