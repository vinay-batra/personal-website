// The ease of record for the whole site.
export const EASE = [0.16, 1, 0.3, 1] as const;

export const lineReveal = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: "0%",
    transition: { duration: 0.9, delay: i * 0.09, ease: EASE },
  }),
};

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: EASE },
  }),
};
