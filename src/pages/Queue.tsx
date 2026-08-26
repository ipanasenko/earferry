import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../lib/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AddForm } from "../components/AddForm";
import { QueueItem } from "../components/QueueItem";
import { EmptyState } from "../components/EmptyState";

export function QueuePage() {
  const items = useQuery(api.items.list, {});
  const add = useMutation(api.items.add);
  const [searchParams, setSearchParams] = useSearchParams();

  // Bookmarklet entry point: /?add=<youtube url>
  const addParam = searchParams.get("add");
  useEffect(() => {
    if (!addParam) return;
    setSearchParams({}, { replace: true });
    void add({ url: addParam }).catch(() => {});
  }, [addParam, add, setSearchParams]);

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5">
          <h1 className="font-regular tracking-tight text-center text-text text-xl/8.5">
            Save it for a calmer hour.
          </h1>
          <AddForm />
        </section>
        {items === undefined ? null : items.length === 0 ? (
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
