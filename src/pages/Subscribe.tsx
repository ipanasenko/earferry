import { CheckoutLink } from "@convex-dev/polar/react";
import { useQuery } from "convex/react";
import { polarApi } from "../lib/api";
import { track } from "../lib/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

function money(cents: number): string {
  const amount = cents / 100;
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

interface Plan {
  id: string;
  interval: "year" | "month";
  label: string;
  amount: number;
}

/**
 * The live recurring products as the page renders them: yearly first, because
 * it is the anchor price. Returns null while products are still loading.
 */
function usePlans(): Plan[] | null {
  const products = useQuery(polarApi.listAllProducts, {});
  if (!products) return null;
  const plans: Plan[] = [];
  for (const interval of ["year", "month"] as const) {
    const product = products.find(
      (candidate) =>
        candidate.isRecurring &&
        !candidate.isArchived &&
        candidate.prices[0]?.recurringInterval === interval,
    );
    const amount = product?.prices[0]?.priceAmount;
    if (!product || amount === undefined) continue;
    plans.push({ id: product.id, interval, label: `${money(amount)} / ${interval}`, amount });
  }
  return plans;
}

/** Quote the yearly saving against twelve monthly charges. */
function savingLine(plans: Plan[]): string {
  const yearly = plans.find((plan) => plan.interval === "year");
  const monthly = plans.find((plan) => plan.interval === "month");
  if (!yearly || !monthly) return "";
  const saving = monthly.amount * 12 - yearly.amount;
  return saving > 0 ? `Yearly saves ${money(saving)}. ` : "";
}

/** Subscribe page per the "App · Subscribe" Paper artboard. */
export function SubscribePage() {
  const plans = usePlans();

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header minimal />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5 sm:pt-18">
          <h1 className="font-extrabold tracking-tight text-center text-text text-xl/8.5">
            Simple pricing. Cancel anytime.
          </h1>
          <p className="text-text-muted text-base/5.5 text-center max-w-115">
            Subscribe to start ferrying audio to your podcast app.
          </p>
          <div className="flex flex-col items-center pt-5 gap-4">
            {plans ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                {plans.map((plan, index) => (
                  // The click lands on the anchor CheckoutLink renders; the
                  // wrapper only listens for it on the way up.
                  <div
                    key={plan.id}
                    onClick={() => track("subscribe_clicked", { interval: plan.interval })}
                  >
                    <CheckoutLink
                      polarApi={polarApi}
                      productIds={[plan.id]}
                      className={
                        index === 0
                          ? "flex items-center h-13 px-7 rounded-pill shadow-cta bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
                          : "flex items-center h-13 px-7 rounded-pill shadow-pill bg-background font-semibold text-text text-base/4.5 cursor-pointer hover:text-ink transition-colors"
                      }
                    >
                      {plan.label}
                    </CheckoutLink>
                  </div>
                ))}
              </div>
            ) : (
              // Products reach Convex through Polar's webhook, so hold the
              // buttons' footprint rather than flashing an empty page.
              <div aria-hidden className="h-13 w-80 rounded-pill bg-surface animate-pulse" />
            )}
            <p className="text-text-muted text-sm/4 text-center">
              {plans && savingLine(plans)}Secure checkout by Polar.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
}
