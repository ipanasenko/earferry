import { CheckoutLink } from "@convex-dev/polar/react";
import { useQuery } from "convex/react";
import { polarApi } from "../lib/api";
import { track } from "../lib/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

// EarFerry sells monthly only for now. A yearly product would concentrate
// refund exposure into a single prepayment, which is not worth it until the
// Polar account has some trading history.
const SOLD_INTERVAL = "month";

function money(cents: number): string {
  const amount = cents / 100;
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

interface Plan {
  id: string;
  label: string;
}

/** The live plan, or null while products are still loading. */
function usePlan(): Plan | null | undefined {
  const products = useQuery(polarApi.listAllProducts, {});
  if (!products) return undefined;
  const product = products.find(
    (candidate) =>
      candidate.isRecurring &&
      !candidate.isArchived &&
      candidate.prices[0]?.recurringInterval === SOLD_INTERVAL,
  );
  const amount = product?.prices[0]?.priceAmount;
  if (!product || amount === undefined) return null;
  return { id: product.id, label: `Subscribe · ${money(amount)}/${SOLD_INTERVAL}` };
}

/** Subscribe page per the "App · Subscribe" Paper artboard. */
export function SubscribePage() {
  const plan = usePlan();

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
                  {plan.label}
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
