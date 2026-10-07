import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

import { AnimatedTitle } from "./animated-title";
import { IMAGE_LINKS } from "@/constants";

gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(useGSAP);

export const About = () => {
  useGSAP(() => {
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#clip",
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
      },
    });

    clipAnimation.to(".mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });
  });

  return (
    <div id="about" className="min-h-screen w-screen">
      <div className="relative mt-36 mb-8 flex flex-col items-center gap-5">
        <p className="font-general text-sm uppercase md:text-[10px]">
          Welcome to Valorant
        </p>

        <AnimatedTitle containerClass="mt-5 !text-black text-center">
          {"Disc<b>o</b>ver the ultimate <br /> 5v5 t<b>a</b>ctical shooter"}
        </AnimatedTitle>

        <div className="about-subtext">
          <p>The Protocol is calling—your aim, now a superpower</p>
          <p>Valorant unites the deadliest agents from across the globe</p>
        </div>
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src={IMAGE_LINKS.about}
            alt="VALORANT agents Sova and Phoenix - Defy the Limits"
            className="absolute top-0 left-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
