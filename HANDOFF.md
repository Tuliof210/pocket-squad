# HANDOFF — Pocket Squad

> Contexto para continuar o desenvolvimento no Claude Code, com o projeto aberto.
> Origem: conversa de concepção e geração da v0.1.0 (2026-07-10).

## O que é o projeto

**Pocket Squad**: pacote npx que instala uma squad de desenvolvimento completa para
Claude Code em qualquer projeto. Ao rodar `npx pocket-squad`, o projeto recebe
`.claude/` (agents + commands) e `.squad/` (workflow de Histórias/Tarefas em MD).

O dono do projeto (humano) pede algo via `/ps:story`; o TechLead refina, gera uma ou
MAIS Histórias (com Tarefas) em markdown editáveis; o dono revisa/edita e dá `/ps:run`
(que valida e executa — o antigo `/approve` foi removido); agentes especialistas
executam com gates de QA/review sem viés, e cada História vira uma PR com ADR,
squash-merged na branch de origem.

## Decisões de design já tomadas (não rediscutir sem motivo)

1. **Tiers em vez de escolha dinâmica de modelo.** Subagentes têm modelo fixo no
   frontmatter, então cada especialidade tem 3 agentes: junior (haiku), pleno
   (sonnet), senior (opus). O TechLead roteia por rubrica escrita e grava a
   justificativa na Tarefa (auditável).
2. **Junior não improvisa.** Se falta decisão no task file → `status: blocked` e
   devolve ao techlead. Escalar é sucesso no tier dele.
3. **Escalação automática:** 2 reprovações no mesmo tier → techlead reatribui ao tier
   acima (nunca 3ª tentativa no mesmo tier).
4. **DoD verificado por terceiro** — implementador nunca se auto-aprova.
   **Revisado (2026-07-13):** os gates dividem em vez de triplicar: reviewer é dono
   do diff + DoD executável (roda lint/test/build ele mesmo); QA é dono do
   comportamento (exercita critérios de aceite) e não repete a suíte. A suíte roda
   2x (implementador + reviewer), não 3x.
5. **Sem "modo rápido" que fure o histórico** (decisão explícita do dono).
   **Revisado (2026-07-13):** existe a **express lane** (`express: true` na story;
   critérios: todas as tarefas junior+S, sem contrato, sem superfície de
   auth/segurança/migração — auditado pelo `/ps:run`, que derruba a flag se
   violada). Ela NÃO fura o histórico — story/tasks/board/PR/ADR continuam —
   só colapsa o gate duplo em um (reviewer-pleno absorve o QA comportamental).
6. **`project-context.md` é gerenciado pela squad**, destilado do CLAUDE.md/AGENTS.md
   no install ou por investigação do techlead. Fonte previsível e enxuta para agentes.
7. **`learnings.md` com formato rígido** (erro → causa → regra → escopo/data/story).
   Sem formato rígido vira lixo de contexto. Inclui learnings de roteamento
   (tarefas sub-tieradas).
8. **Execução retomável/idempotente:** `board.md` + `status` por tarefa são o ponto de
   recuperação; `/run` pula `done` e reseta `doing` órfão para `todo`.
9. **Dependências e paralelismo por tags:** `depends_on: []` e `parallel: true|false`
   no frontmatter da tarefa. Tarefa upstream entrega o **contrato** (schema/types)
   como deliverable para a downstream não adivinhar.
10. **Update não-destrutivo por manifest de hashes:** arquivo intocado → atualiza in
    place; customizado → grava `.new` ao lado; install nunca sobrescreve nada.
11. **Idiomas:** conversa com o dono no idioma dele; arquivos de Story/Task em inglês
    (mais robusto para modelos menores — convenção herdada das skills squad-plan/run
    do usuário, que serviram de referência).
12. ~~Custo visível via `/approve`~~ **Revisado:** `/approve` foi removido (gargalo
    que só queimava tokens). A validação do plano (depends_on, contratos, DoD) vive
    no passo 0 do `/ps:run`; a revisão do dono é editar os arquivos antes de rodar.
13. **Comandos namespaced** (`/ps:story`, `/ps:run`, `/ps:status`) via subpasta
    `commands/ps/` para não colidir com commands de nível mais alto.
14. **1 História = 1 PR = 1 worktree.** `/ps:run` sem argumento executa TODAS as
    histórias executáveis; cada uma roda em worktree git ISOLADA
    (`../<repo>--squad/<slug>`) na branch `squad/<slug>` cortada da branch onde o
    comando foi evocado — por isso histórias independentes rodam em paralelo, e
    `depends_on` (nível história) espera o merge da dependência. Termina em PR com
    ADR de 3 seções (título / descrição / consideração final), squash-merge, remoção
    da worktree e `git pull --rebase` local. Histórias críticas (migração destrutiva,
    segurança, quebra de contrato público) deixam a PR aberta para merge manual.
    Learnings são anexados no checkout principal PÓS-merge (evita conflito entre
    histórias paralelas).
15. **Skills de terceiros NÃO são empacotadas** (decisão do dono): impeccable e
    ponytail não fazem parte do pacote. O install valida se existem na máquina
    (`.claude/skills/` do projeto, `~/.claude/skills/` global, ou o plugin ponytail
    em `~/.claude/plugins/cache/`) e só quando ausentes busca versão PINADA
    localmente no projeto: impeccable via `npx impeccable@<pin> install --project
    --providers=claude --yes`; ponytail-review via `npm pack
    @dietrichgebert/ponytail@<pin>` + extração da skill (MIT, LICENSE junto).
    Best-effort (offline → aviso), opt-out `POCKET_SQUAD_SKIP_SKILLS=1`. As únicas
    skills empacotadas são as proprietárias `ps-backend-api|data|security`.
16. **Task files auto-contidos + skills sob demanda (2026-07-13, inspirado na skill
    `/squad` do dono):** a inteligência mora no plan-time. O techlead investiga o
    repo na Fase 1.5 (Explores paralelos read-only: mapa do código, comandos de
    verificação, riscos, design system) e destila tudo na seção `## Context` de cada
    task file — obrigatória. Especialistas leem SÓ o task file (zero re-exploração;
    fallback para project-context/learnings apenas em stories antigas sem
    `## Context`) e carregam SÓ as skills listadas no frontmatter `skills: []` do
    task (default vazio; techlead lista `impeccable`/`ps-backend-*` só quando
    aplicam materialmente). Reviewer aplica a barra ponytail inline e só invoca a
    skill `ponytail-review` em diffs grandes. Designer mantém `impeccable` sempre
    (é a barra de craft dele). Motivo: 3 subagentes frios relendo contexto +
    carregando skills pesadas + suíte 3x fazia uma story trivial custar ~40min.

## Estado atual (v0.1.0 — gerado e testado)

```
pocket-squad/
├── package.json                  # bin: pocket-squad, zero deps, node >=18
├── README.md
├── bin/pocket-squad.js           # install | update | status (manifest sha256)
└── templates/
    ├── claude/
    │   ├── agents/               # 15 agentes
    │   │   ├── techlead.md                     (opus — refinamento, rubrica, escalação)
    │   │   ├── backend|frontend|devops-{junior,pleno,senior}.md
    │   │   ├── qa-{pleno,senior}.md            (gates sem viés)
    │   │   ├── reviewer-{pleno,senior}.md
    │   │   └── designer.md                     (sonnet — specs, não código)
    │   ├── commands/ps/
    │   │   ├── story.md  run.md  status.md   # → /ps:story /ps:run /ps:status
    │   └── skills/
    │       └── ps-backend-{api,data,security}/  # proprietárias (únicas empacotadas)
    │       # impeccable e ponytail-review NÃO são empacotadas: o install checa a
    │       # máquina e, se ausentes, busca versão pinada para .claude/skills/ local
    └── squad/
        ├── project-context.md    # template de briefing 1 página
        ├── learnings.md          # formato rígido documentado
        └── stories/.gitkeep
```

**Testado:** ciclo install → customização de agente → update (arquivo intocado
atualizado in place; customizado preservado + `.new`) → status. Tudo passou.

**Manifest:** gravado em `.claude/pocket-squad.manifest.json` no projeto alvo.

## Fluxo instalado no projeto alvo

`/ps:story "pedido"` → techlead refina → gera 1..N `.squad/stories/<data>-<slug>/
{story.md, tasks/NN-*.md, board.md}` (status: draft) → dono edita (edições são lei) →
`/ps:run` (valida o plano, depois: branch por história, ondas paralelas, gates,
escalação, PR com ADR, squash-merge + rebase, learnings ao final) → `/ps:status` a
qualquer momento.

## Backlog priorizado (próximos passos)

1. **Few-shot no techlead** (mais impacto): embutir exemplos concretos de `story.md` e
   `task.md` preenchidos no prompt do techlead para consistência de formato. Calibrar
   rodando uma primeira História real.
2. **Dogfooding:** instalar o Pocket Squad no próprio repo do Pocket Squad e usar
   `/story` para as próximas features.
3. **Skills de terceiros:** curadoria de skills externas (frontend craft, rubric de
   code review etc.) em `templates/claude/skills/`, com versões fixadas — supply
   chain: revisar antes de incluir.
4. **Publicação:** `npm publish` (checar se o nome está livre; fallback
   `@scope/pocket-squad`). Teste local: `npm link` ou `node bin/pocket-squad.js install`.
5. **"História mínima"** formalizada no prompt do techlead (hoje só mencionada).

## Riscos conhecidos

- Squad completa por tarefa é cara — techlead deve preferir o menor conjunto de
  agentes que satisfaz o DoD (já instruído, monitorar na prática).
- learnings.md pode degenerar em ruído — regra: entrada que não muda comportamento
  futuro é deletada.
- Skills baixadas rodam com acesso ao código — tratar como dependência.
