import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useEffect, useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";

import { Button } from "./button";
import { VIDEO_LINKS } from "@/constants";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);

export const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [hasClicked, setHasClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(new Set<string>());

  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);

  const totalVideos = 4;
  const upcomingVideoIndex = (currentIndex % totalVideos) + 1;

  const handleMiniVideoClick = () => {
    setHasClicked(true);

    setCurrentIndex(upcomingVideoIndex);
  };

  const VIDEO_KEYS = ["hero1", "hero2", "hero3", "hero4"] as const;
  const getVideoSrc = (i: number) => {
    const key = VIDEO_KEYS[i - 1]; // Subtract 1 because the array is 0-indexed, but the video indices are 1-based
    return VIDEO_LINKS[key];
  };

  /**
   * The hero only ever mounts two distinct reels up front - the full-bleed
   * background (hero-1) and the "up next" mini video (hero-2). hero-3/hero-4 are
   * pulled in as the viewer cycles the carousel, so gating on all four would hang
   * the preloader forever.
   */
  const PRELOADED_REELS = 2;

  /**
   * Track which reels are ready by source path. `onLoadedData` alone is not
   * enough: on a warm cache a video can finish loading before React attaches its
   * handler, which would leave the loader up.
   */
  const reportReady = (video: HTMLVideoElement | null) => {
    if (video) {
      const key = video.currentSrc || video.src;
      if (key) loadedRef.current.add(key);
    }

    // Also count anything that completed before this render.
    document.querySelectorAll<HTMLVideoElement>("#hero video").forEach((v) => {
      const src = v.currentSrc || v.src;
      if (src && v.readyState >= 2) loadedRef.current.add(src);
    });

    if (loadedRef.current.size >= PRELOADED_REELS) setIsLoading(false);
  };

  useEffect(() => {
    // Safety net: never hold the page hostage behind the preloader.
    const timer = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useGSAP(
    () => {
      if (hasClicked && nextVideoRef.current && miniVideoRef.current) {
        const nextVideo = nextVideoRef.current;
        const miniVideo = miniVideoRef.current;

        gsap.set(nextVideo, { visibility: "visible" });

        gsap.to(nextVideo, {
          transformOrigin: "center center",
          scale: 1,
          width: "100%",
          height: "100%",
          duration: 1,
          ease: "power1.inOut",
          onStart: () => {
            void nextVideo.play();
          },
        });

        gsap.from(miniVideo, {
          transformOrigin: "center center",
          scale: 0,
          duration: 1.5,
          ease: "power1.inOut",
        });
      }
    },
    { dependencies: [currentIndex], revertOnUpdate: true }
  );

  useGSAP(() => {
    gsap.set("#video-frame", {
      clipPath: "polygon(14% 0%, 72% 0%, 90% 90%, 0% 100%)",
      borderRadius: "0 0 40% 10%",
    });

    gsap.from("#video-frame", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0 0 0 0",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#video-frame",
        start: "center center",
        end: "bottom center",
        scrub: true,
      },
    });
  });

  return (
    <section id="hero" className="relative h-dvh w-screen overflow-x-hidden">
      {isLoading && (
        <div className="flex-center absolute z-100 h-dvh w-screen overflow-hidden bg-violet-50">
          <div className="three-body">
            <div className="three-body__dot" />
            <div className="three-body__dot" />
            <div className="three-body__dot" />
          </div>
        </div>
      )}

      <div
        id="video-frame"
        className="bg-blue-75 relative z-10 h-dvh w-screen overflow-hidden rounded-lg"
      >
        <div>
          <div className="mask-clip-path absolute-center absolute z-50 size-64 cursor-pointer overflow-hidden rounded-lg">
            <div
              onClick={handleMiniVideoClick}
              className="origin-center scale-50 opacity-0 transition-all duration-500 ease-in hover:scale-100 hover:opacity-100"
            >
              <video
                ref={miniVideoRef}
                src={getVideoSrc(upcomingVideoIndex)}
                loop
                muted
                id="current-video"
                className="size-64 origin-center scale-150 object-cover object-center"
                onLoadedData={(e) => reportReady(e.currentTarget)}
              />
            </div>
          </div>

          <video
            ref={nextVideoRef}
            src={getVideoSrc(currentIndex)}
            loop
            muted
            id="next-video"
            className="absolute-center invisible absolute z-20 size-64 object-cover object-center"
            onLoadedData={(e) => reportReady(e.currentTarget)}
          />

          <video
            ref={backgroundVideoRef}
            src={getVideoSrc(
              currentIndex === totalVideos - 1 ? 1 : currentIndex
            )}
            autoPlay
            loop
            muted
            className="absolute top-0 left-0 size-full object-cover object-center"
            onLoadedData={(e) => reportReady(e.currentTarget)}
          />
        </div>

        <h1 className="special-font hero-heading text-blue-75 absolute right-5 bottom-5 z-40">
          V<b>a</b>lorant
        </h1>

        <div className="absolute top-0 left-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="special-font hero-heading text-blue-100">
              Tactic<b>a</b>l
            </h1>

            <p className="font-robert-regular mb-5 max-w-64 text-blue-100">
              One Spike. Thirteen rounds. <br />
              Make every bullet count.
            </p>

            <Button
              id="watch-trailer"
              leftIcon={TiLocationArrow}
              containerClass="bg-yellow-300 flex-center gap-1"
            >
              Watch Trailer
            </Button>
          </div>
        </div>
      </div>

      <h1 className="special-font hero-heading absolute right-5 bottom-5 text-black">
        V<b>a</b>lorant
      </h1>
    </section>
  );
};
