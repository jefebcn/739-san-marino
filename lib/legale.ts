// Chi gestisce 739 (Privacy e Termini). Privacy e Termini approvati da Alex il 14/10/2026:
// manca solo la società titolare. Quando Alex dà i dati si scrivono qui e compaiono in tutte e due le pagine.
export const TITOLARE = {
  nome: "", // ragione sociale
  sede: "", // indirizzo della sede
  email: "", // email per privacy e contatti
};

const IN_ARRIVO = "[in arrivo]";
export const titolare = () => (TITOLARE.nome ? `${TITOLARE.nome}${TITOLARE.sede ? `, con sede in ${TITOLARE.sede}` : ""}` : `la società che gestisce 739 ${IN_ARRIVO}`);
export const emailContatto = () => (TITOLARE.email ? `[${TITOLARE.email}](mailto:${TITOLARE.email})` : `l'indirizzo email di 739 ${IN_ARRIVO}`);
