import { PricingTable } from "@clerk/clerk-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function SubscribePage() {
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5">
          <h1 className="font-regular tracking-tight text-center text-text text-xl/8.5">
            One plan. Cancel anytime.
          </h1>
          <p className="text-text-muted text-base/5.5 text-center">
            Subscribe to start ferrying audio to your podcast app.
          </p>
          <div className="w-full max-w-[420px] pt-4">
            <PricingTable />
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
}
