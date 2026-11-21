# RANDOM GUNNY 🎲🔫

https://thatdp.github.io/Random-Gunny/

**3D Weapon Randomizer Shooter** — atire (ou esfaqueie) com armas sorteadas. Inspirado no Randomizer do Roblox.

## Rode agora

```bash
npm install
npm run dev      # http://localhost:5173
```

Produção:

```bash
npm run build && npm run preview
```

## Controles

| Tecla | Ação |
|---|---|
| `W A S D` | Mover · `SHIFT` Correr · `ESPAÇO` Pular · `CTRL/C` Agachar |
| Mouse | Câmera · Botão esq. Atirar / Ataque leve · Botão dir. Mira (ADS) / Ataque pesado |
| `R` | Recarregar · `F` 1ª/3ª pessoa · `Tab` Placar · `Esc` Pausar |
| `G` | Randomizar arma (qualquer) · `Z` Randomizar arma de fogo · `X` Randomizar corpo a corpo |
| `M` | Mudo |

## Destaques

- **22 armas únicas** — pistolas, revólveres, SMGs, rifles de assalto, escopetas, snipers, metralhadoras, futuristas e experimentais + katanas, machados, martelos, lanças, baguettes e um famigerado frango de borracha. Cada uma com modelo 3D procedural, sons, dano, alcance, cadência e animações próprias.
- **Sistema Randomizer completo e configurável** — troca ao eliminar, troca por tempo (10/15/20/30/45s), entre rodadas, pool total/só-fogo/só-melee, ou na tecla `G`. Fogo e melee podem ser sorteados separadamente.
- **8 modos single-player vs bots** — RANDO Arena, Free For All, Team Deathmatch, Eliminação (rodadas), Sobrevivência (ondas), Só Armas de Fogo, Só Corpo a Corpo e Arena Total.
- **Bots com I.A.** — perseguem, flanqueiam, atiram em rajadas, trocam de posição, reagem a distância, dificuldade Fácil/Normal/Veterano.
- **Arena 3D própria** — Galpão Neon-7: plataforma central em 3 níveis, containers empilháveis, passarela elevada, pilares, caixotes e neon.
- Gráficos 3D com iluminação, sombras suaves, tracers, partículas, ejeção de estojos e recuo.

## Desenvolvimento

```bash
node scripts/smoke-test.mjs   # smoke test headless (DOM/WebGL stubbed)
npx eslint src/*.js           # lint
```
