import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bookmarklet entry point: /?add=<youtube url>
  const addParam = searchParams.get("add");
  useEffect(() => {
    if (!addParam) return;
    setSearchParams({}, { replace: true });
    void add({ url: addParam }).catch(() => {});
  }, [addParam, add, setSearchParams]);

  function togglePlay(itemId: string, mediaUrl: string | undefined) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === itemId) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    if (!mediaUrl) return;
    audio.src = mediaUrl;
    void audio.play();
    setPlayingId(itemId);
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full max-w-[1180px] flex flex-col px-6 md:px-25 pb-20">
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
          <div className="flex flex-col gap-3.5">
            {items.map((item) => (
              <QueueItem
                key={item._id}
                item={item}
                isPlaying={playingId === item._id}
                onTogglePlay={() => togglePlay(item._id, item.mediaUrl)}
              />
            ))}
          </div>
        )}
        <Footer />
        <audio
          ref={audioRef}
          onEnded={() => setPlayingId(null)}
          onPause={() => setPlayingId(null)}
          className="hidden"
        />
      </div>
    </div>
  );
}
