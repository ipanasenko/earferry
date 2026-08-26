import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useClerk } from "@clerk/clerk-react";
import { Footer } from "../components/Footer";
import { LogoMarkSmall } from "../components/icons";

export function StaticPageLayout({
  title,
  meta,
  footerLinks,
  children,
}: {
  title: string;
  meta: React.ReactNode;
  footerLinks: { to: string; label: string }[];
  children: React.ReactNode;
}) {
  const { signOut } = useClerk();
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-6 md:px-25 pb-15">
        <header className="flex items-center pt-7.5 pb-10 gap-2.75">
          <Link to="/" className="flex items-center gap-2.75">
            <LogoMarkSmall size={30} />
            <span className="font-extrabold tracking-tight text-ink text-lg/base">earferry</span>
          </Link>
          <div className="ml-auto">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="flex items-center h-9.5 px-5 rounded-pill bg-ink font-semibold text-background text-sm/4 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center h-9.5 px-4.5 rounded-pill [box-shadow:#10141814_0px_1px_3px] bg-background font-semibold text-text-muted text-sm/4 cursor-pointer hover:text-text transition-colors"
              >
                Log out
              </button>
            </SignedIn>
          </div>
        </header>
        <main className="w-full max-w-165 mx-auto flex flex-col">
          <h1 className="mb-1.5 font-extrabold tracking-tight text-ink text-[32px]/10 md:text-display/display">
            {title}
          </h1>
          <div className="pb-7">{meta}</div>
          {children}
        </main>
        <Footer links={footerLinks} showMark={false} />
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
