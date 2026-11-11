export type Offer = {
  id: number;
  alt: string;
  logo: string;
  sum: string;
  rate: string;
  badge?: string;
  badgeBlue?: boolean;
};

export const WEB_APP_URL = "https://www.google.com/";

export const offers: Offer[] = [
  {
    id: 1,
    badge: "-99% з кодом TREAT",
    logo: "/logos/light-credo.png",
    alt: "Light Credo",
    sum: "до 22 000 ₴",
    rate: "від 0,9%",
  },
  {
    id: 2,
    logo: "/logos/shvydkohroshi.png",
    alt: "ШвидкоГроші",
    sum: "до 50 000 ₴",
    rate: "від 0,01%",
  },
  {
    id: 3,
    badge: "Максимальна сума",
    badgeBlue: true,
    logo: "/logos/tvoyapozyka.png",
    alt: "ТвояПозика",
    sum: "до 150 000 ₴",
    rate: "від 0,01%",
  },
  {
    id: 4,
    logo: "/logos/limon.png",
    alt: "Limon",
    sum: "до 27 000 ₴",
    rate: "від 0,09%",
  },
  {
    id: 5,
    badge: "-90% з кодом NAF90",
    logo: "/logos/finstep.png",
    alt: "FinStep",
    sum: "до 66 000 ₴",
    rate: "від 0,01%",
  },
  {
    id: 6,
    logo: "/logos/slon.png",
    alt: "Slon Credit",
    sum: "до 32 000 ₴",
    rate: "від 0,01%",
  },
  {
    id: 7,
    logo: "/logos/crypsee.png",
    alt: "Crypsee",
    sum: "до 40 000 ₴",
    rate: "від 0,01%",
  },
  {
    id: 8,
    badge: "Швидке схвалення",
    logo: "/logos/offer-8.png",
    alt: "Оферта 8",
    sum: "до 30 000 ₴",
    rate: "від 0,01%",
  },
];
