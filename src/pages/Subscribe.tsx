import { CheckoutLink } from "@convex-dev/polar/react";
import { useQuery } from "convex/react";
import { polarApi } from "../lib/api";
import { track } from "../lib/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

function priceLabel(amountCents: number | undefined, interval: string | null | undefined): string {
  if (amountCents === undefined) return "Subscribe";
  const amount = amountCents / 100;
  const price = Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
  return interval ? `Subscribe · ${price}/${interval}` : `Subscribe · ${price}`;
}

/** Subscribe page per the "App · Subscribe" Paper artboard. */
export function SubscribePage() {
  const products = useQuery(polarApi.listAllProducts, {});

  // EarFerry sells a single recurring plan, so the first live one is the plan.
  const plan = products?.find((product) => product.isRecurring && !product.isArchived);
  const price = plan?.prices[0];

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header minimal />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5 sm:pt-18">
          <h1 className="font-extrabold tracking-tight text-center text-text text-xl/8.5">
            One plan. Cancel anytime.
          </h1>
          <p className="text-text-muted text-base/5.5 text-center max-w-115">
            Subscribe to start ferrying audio to your podcast app.
          </p>
          <div className="flex flex-col items-center pt-5 gap-3.5">
            {plan ? (
              // The click lands on the anchor CheckoutLink renders; the wrapper
              // only listens for it on the way up.
              <div onClick={() => track("subscribe_clicked")}>
                <CheckoutLink
                  polarApi={polarApi}
                  productIds={[plan.id]}
                  className="flex items-center h-13 px-7 rounded-pill shadow-cta bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {priceLabel(price?.priceAmount, price?.recurringInterval)}
                </CheckoutLink>
              </div>
            ) : (
              // Products reach Convex through Polar's webhook, so hold the
              // button's footprint rather than flashing an empty page.
              <div aria-hidden className="h-13 w-56 rounded-pill bg-surface animate-pulse" />
            )}
            <p className="text-text-muted text-sm/4 text-center">Secure checkout by Polar.</p>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
}
