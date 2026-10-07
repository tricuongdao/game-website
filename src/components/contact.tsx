import { Button } from "./button";
import { IMAGE_LINKS } from "@/constants";

interface ImageClipBoxProps {
  src: string;
  alt: string;
  clipClass?: string;
}

const ImageClipBox = ({ src, alt, clipClass }: ImageClipBoxProps) => (
  <div className={clipClass}>
    <img src={src} alt={alt} />
  </div>
);

export const Contact = () => {
  return (
    <section id="contact" className="my-20 min-h-96 w-screen px-10">
      <div className="relative rounded-lg bg-black py-24 text-blue-50 sm:overflow-hidden">
        <div className="absolute top-0 -left-20 hidden h-full w-72 overflow-hidden sm:block lg:left-20 lg:w-96">
          <ImageClipBox
            src={IMAGE_LINKS.contactAgent}
            alt="VALORANT agent key art"
            clipClass="contact-clip-path-1"
          />

          <ImageClipBox
            src={IMAGE_LINKS.contactSupport}
            alt="VALORANT agent key art"
            clipClass="contact-clip-path-2 lg:translate-y-40 translate-y-60"
          />
        </div>

        <div className="absolute -top-40 left-20 w-60 sm:top-1/2 md:right-10 md:left-auto lg:top-20 lg:w-80">
          <ImageClipBox
            src={IMAGE_LINKS.agentPortrait}
            alt="VALORANT agent portrait"
            clipClass="absolute md:scale-125"
          />

          <ImageClipBox
            src={IMAGE_LINKS.agentSupport}
            alt="VALORANT agent key art"
            clipClass="sword-man-clip-path md:scale-125"
          />
        </div>

        {/*
          z-10 puts the copy above the absolutely-positioned art panels. Without
          it the panels paint over the heading (positioned boxes beat static
          ones) and chop words off at both ends on tablet widths.
        */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="font-general text-[10px] uppercase">
            Join the Protocol
          </p>

          <p className="special-font font-zentry mt-10 w-full text-[clamp(3rem,8vw,6rem)] leading-[0.9] [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]">
            Let's def<b>y</b> the
            <br /> limits of play <br /> t<b>o</b>gether
          </p>

          <Button containerClass="mt-10 cursor-pointer">Contact Us</Button>
        </div>
      </div>
    </section>
  );
};
