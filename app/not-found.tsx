import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { loadSettings } from "@/lib/settings-source";

export default async function NotFound() {
  const settings = await loadSettings();
  return (
    <>
    <Nav />
    <main id="main">
    <section data-surface="cream">
      <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 md:py-36">
        <p className="kicker">404</p>
        <h1 className="display mt-3 max-w-2xl text-[clamp(2.4rem,6.5vw,5rem)]">That page isn&rsquo;t on the schedule.</h1>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">Back home</Link>
          <Link href="/classes" className="btn btn-ghost">See the classes</Link>
        </div>
      </div>
    </section>
    </main>
    <Footer settings={settings} />
    </>
  );
}
