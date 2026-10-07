import gsap from "gsap";
import { useRef } from "react";

import { AnimatedTitle } from "./animated-title";
import { Button } from "./button";
import { RoundedCorners } from "./rounded-corners";
import { IMAGE_LINKS } from "@/constants";

export const Story = () => {
  const frameRef = useRef<HTMLImageElement>(null);

  const handleMouseLeave = () => {
    const element = frameRef.current;

    if (!element) return;

    gsap.to(element, {
      duration: 0.3,
      rotateX: 0,
      rotateY: 0,
      ease: "power1.inOut",
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const { clientX, clientY } = e;
    const element = frameRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    gsap.to(element, {
      duration: 0.3,
      rotateX,
      rotateY,
      transformPerspective: 500,
      ease: "power1.inOut",
    });
  };

  return (
    <section id="story" className="min-h-dvh w-screen bg-black text-blue-50">
      <div className="flex size-full flex-col items-center py-10 pb-24">
        <p className="font-general text-sm uppercase md:text-[10px]">
          the world of valorant
        </p>

        <div className="relative size-full">
          <AnimatedTitle containerClass="mt-5 pointer-events-none mix-blend-difference relative z-10">
            {"The St<b>o</b>ry of <br /> a hidden Prot<b>o</b>col"}
          </AnimatedTitle>

          <div className="story-img-container">
            <div className="story-img-mask">
              <div className="story-img-content">
                <img
                  ref={frameRef}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseLeave}
                  onMouseEnter={handleMouseLeave}
                  onMouseMove={handleMouseMove}
                  src={IMAGE_LINKS.story}
                  alt="A VALORANT strike team silhouetted on the way to the Protocol"
                  className="object-contain"
                />
              </div>
            </div>

            <RoundedCorners />
          </div>
        </div>

        <div className="-mt-80 flex w-full justify-center md:me-44 md:-mt-64 md:justify-end">
          <div className="flex h-full w-fit flex-col items-center md:items-start">
            <p className="font-circular-web mt-3 max-w-sm text-center text-violet-50 md:text-start">
              Where radianite sparks conflict, the VALORANT Protocol stands
              watch. Discover its secrets and shape your fate one clutch at a
              time.
            </p>

            <Button id="realm-button" containerClass="mt-5">
              Uncover the Protocol
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
