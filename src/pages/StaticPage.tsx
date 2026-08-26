import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

export function StaticPageLayout({
  title,
  meta,
  children,
}: {
  title: string;
  meta: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-6 md:px-25">
        <Header />
        <main className="w-full max-w-165 mx-auto flex flex-col">
          <h1 className="mb-1.5 font-extrabold tracking-tight text-ink text-[32px]/10 md:text-display/display">
            {title}
          </h1>
          <div className="pb-7">{meta}</div>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export function StaticSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-semibold text-text text-lg/base">{title}</h2>
      <p className="text-text-muted text-base/base">{body}</p>
    </div>
  );
}
