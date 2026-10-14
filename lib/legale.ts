// Chi gestisce 739 (Privacy e Termini, approvati da Alex il 14/10/2026): la stessa società di FantaTitano.
// In pagina per ora solo nome, paese ed email. Sede, partita IVA e numero di registro si aggiungono qui
// solo se Alex lo chiede. Per sua scelta niente nome del rappresentante né telefono.
export const TITOLARE = {
  nome: "Mediterranean Digital Solutions Ltd",
  paese: "Malta",
  sede: "", // indirizzo, se Alex vuole mostrarlo
  email: "info@mediterraneandigital.mt", // per le richieste sui dati e i contatti
};

export const titolare = () => `${TITOLARE.nome}${TITOLARE.sede ? `, ${TITOLARE.sede}` : ""}, con sede a ${TITOLARE.paese}`;
export const emailContatto = () => `[${TITOLARE.email}](mailto:${TITOLARE.email})`;
