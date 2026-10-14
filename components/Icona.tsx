import type { Icon, IconWeight } from "@phosphor-icons/react";
import {
  ArrowRight,
  Briefcase,
  Bus,
  CableCar,
  CalendarBlank,
  CalendarPlus,
  CaretLeft,
  CaretRight,
  Clock,
  FirstAid,
  ForkKnife,
  House,
  IdentificationCard,
  LetterCircleP,
  Lifebuoy,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
  NavigationArrow,
  Phone,
  Plus,
  QrCode,
  Recycle,
  ShieldCheck,
  SoccerBall,
  Trophy,
  User,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

// Una sola famiglia di icone (Phosphor), con nomi italiani usati in tutta l'app.
const ICONE = {
  home: House,
  mappa: MapTrifold,
  eventi: CalendarBlank,
  castelli: Trophy,
  utili: Lifebuoy,
  orologio: Clock,
  pin: MapPin,
  freccia: CaretLeft,
  avanti: CaretRight,
  vai: ArrowRight,
  calendario: CalendarPlus,
  indicazioni: NavigationArrow,
  telefono: Phone,
  persona: User,
  scudo: ShieldCheck,
  allerta: WarningCircle,
  sport: SoccerBall,
  id: IdentificationCard,
  food: ForkKnife,
  business: Briefcase,
  farmacia: FirstAid,
  bus: Bus,
  funivia: CableCar,
  rifiuti: Recycle,
  parcheggio: LetterCircleP,
  cerca: MagnifyingGlass,
  piu: Plus,
  qr: QrCode,
} satisfies Record<string, Icon>;

export type NomeIcona = keyof typeof ICONE;

export function Icona({ nome, size = 24, peso = "regular" }: { nome: NomeIcona; size?: number; peso?: IconWeight }) {
  const Componente = ICONE[nome];
  return <Componente size={size} weight={peso} aria-hidden="true" />;
}
