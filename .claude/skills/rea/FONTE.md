# Da dove viene questa skill

Copiata il 21/10/2026, su richiesta di Alex, da https://github.com/morluto/rea
(cartella `.agents/skills/reverse-engineer-anything`, commit `6d356b84344659085f2b912857b5e27fe0160c9b`).
Licenza MIT (file `LICENSE`, copyright 2026 morluto). Unica modifica: il nome nel frontmatter
è `rea`, così si avvia con `/rea`.

La skill contiene solo istruzioni: gli strumenti veri stanno nel server MCP `rea-agents`
(`npx rea-agents setup`), che non è registrato in questo progetto. Senza il server,
la skill usa il comando `npx -y rea-agents@latest …` dal terminale.
