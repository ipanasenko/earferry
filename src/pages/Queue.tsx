import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../lib/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AddForm } from "../components/AddForm";
import { QueueItem } from "../components/QueueItem";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { usePageMeta } from "../lib/meta";
import { takePendingAdd } from "../lib/pendingAdd";

export function QueuePage() {
  // Renders at "/" for signed-in people, so the canonical stays the landing
  // URL: a crawler only ever sees the signed-out page at this address.
  usePageMeta({
    title: "Your queue · EarFerry",
    description:
      "Save any YouTube video and EarFerry ferries the audio into a private podcast feed you can play anywhere.",
    path: "/",
  });

  const items = useQuery(api.items.list, {});
  const add = useMutation(api.items.add);

  // Entry point for the share target and the bookmarklet, both of which reach
  // the app as /?add=<youtube url>. The link waits in session storage until
  // there is a signed-in account to file it under, which is only now.
  useEffect(() => {
    const url = takePendingAdd();
    if (!url) return;
    void add({ url }).catch(() => {});
  }, [add]);

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-3 pb-6 gap-3.5 sm:pt-6 sm:pb-10 sm:gap-4.5">
          <h1 className="font-regular tracking-tight text-center text-text text-[22px]/7 sm:text-xl/8.5">
            Save it for a calmer hour.
          </h1>
          <AddForm />
        </section>
        {items === undefined ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, height: 0, scale: 0.97 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                >
                  <div className="pb-3.5">
                    <QueueItem item={item} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
