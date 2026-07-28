# HANDOFF — Pocket Squad

> Contexto para continuar o desenvolvimento no Claude Code, com o projeto aberto.
> Origem: conversa de concepção e geração da v0.1.0 (2026-07-10).

## v0.2.0 (2026-07-14) — Reformulação lean

A v0.1 estava lenta: techlead.md (265 linhas) injetado no chat a cada comando,
run.md duplicando o protocolo de execução, 14 agentes quase-clones com cold start,
e o instalador baixando skills externas. Decisões do dono nesta reformulação:

1. **Execução no chat principal.** Após aprovar o plano, o próprio chat (já quente
   com o contexto do refinamento) implementa. Todos os agentes morreram, techlead.md
   morreu. Cold start só onde é feature: o review roda num subagente frio.
2. **Nada em disco como registro de story.** `.squad/stories` morreu; o plan file do
   plan mode + a descrição da PR são o registro. `project-context.md` morreu —
   substituído pelo `CLAUDE.md` do projeto (carregado automaticamente), criado pelo
   novo `/ps:init`.
3. **4 comandos:** `/ps:story` (plan mode → entrevista exaustiva com defaults →
   aprovação → worktree isolada → PR; DoD do comando = PR criada), `/ps:review`
   (subagente general-purpose de contexto frio; o prompt de despacho não carrega
   resumo das mudanças — é isso que sustenta o não-viés), `/ps:publish`
   (squash-merge + `git pull --rebase` + remoção só da worktree daquela story +
   learnings) e `/ps:init`. `ps:run` e `ps:status` morreram.
4. **Skills cortadas por completo.** Sem fetch de impeccable/ponytail, sem
   `ps-backend-*`. Convenções vivem no CLAUDE.md do projeto.
5. **Learnings enxuto.** Uma linha por regra (`- [scope] regra (added YYYY-MM-DD)`),
   cap 30, escrito pelo `/ps:publish` pós-merge, lido pelo `/ps:story`. No `update`,
   arquivos `.squad/` nunca geram `.new` (divergem por design).

O instalador ganhou: remoção de órfãos que sobe diretórios vazios, e o guard de
knowledge files. O smoke test cobre a migração v0.1→v0.2 (órfão intocado deletado,
sem dirs vazios, learnings sem `.new`).

## v0.3.0 (2026-07-21) — Split de conhecimento + story/task em disco + execução granular

Decisões do dono nesta reformulação:

1. **`/ps:init` vira split proposto-e-confirmado em 3 arquivos.** CLAUDE.md fica só
   com o operacional (Stack/Commands/Do-not-touch — o que o Claude Code precisa em
   toda sessão sem abrir outro arquivo) e ganha 2 linhas-ponteiro; `.squad/PRODUCT.md`
   (o quê/pra quem/por quê) e `.squad/ARCHITECTURE.md` (Architecture + Conventions)
   nascem novos. Nunca escreve sem antes listar o que achou/planeja e o dono
   confirmar — igual ao "propose, don't interrogate" do `/ps:story`.
2. **`/ps:story` volta a gravar em disco** (reverte a decisão v0.2 de "sem arquivos
   de story") — mas sem plan mode. Vira só entrevista + investigação read-only;
   grava `.squad/stories/<data>-<slug>/{story.md, tasks/NN-*.md}` e para por aí.
   Não implementa, não abre PR.
3. **Execução separada em 2 comandos novos:** `/ps:load <story>` carrega o contexto
   da story e planeja a ordem das tarefas (a partir de `Depends on`/`Parallel-safe`
   de cada task file); `/ps:run <task>` executa UMA tarefa — worktree a partir da
   branch atual, implementa só com o contexto daquela task, PR de volta pra mesma
   branch. Granularidade mais fina que o "1 história = 1 PR" da v0.2: agora é 1
   tarefa = 1 worktree = 1 PR. O checkbox da tarefa em `story.md` é o marcador de
   "done" — é marcado como último commit da PR da tarefa, então só reflete no branch
   base quando aquela PR é mergeada (sem `board.md` separado).
4. **`/ps:publish` ganha varredura de worktrees**, não só a da PR publicada: depois
   do cleanup de sempre, varre toda worktree `ps/*` cuja PR já esteja merged/closed e
   remove também; PR aberta ou sem PR (tarefa em andamento) fica intocada; nunca
   `--force` no `git worktree remove` — deixa o git recusar se houver mudança não
   commitada.
5. **Templates novos em `.squad/templates/{story,task,pr}.md`** — fonte única da
   forma de story/task/PR, tratados como knowledge file (nunca geram `.new`,
   igual `learnings.md`).

`/ps:review` não muda.

## v0.4.0 (2026-07-27) — Verificação mecânica vira código

Quatro defeitos observados em uso prolongado (dezenas de PRs). O princípio que
atravessa os quatro: **comando em markdown é instrução para um modelo — confiável
para derivar, julgar e escrever; não confiável como executor de checklist mecânico
repetido.** Ênfase no texto não conserta isso; já foi tentado e falhou.

1. **`.claude/ps-check.sh`** (novo, único arquivo executável do pacote; POSIX sh, só
   `git` + descoberta de `gh`/`glab`). `report` (default, read-only): janelas de
   degradação abertas, tamanho do learnings, refs `ps/*` que o sweep removeria.
   `sweep`: remove worktree de PR merged/closed, branch local e remota **só quando o
   provedor confirma MERGED** (sem CLI de provedor não apaga nada e diz isso), e
   fecha com `SUMMARY`. Nunca `--force`. Nasce de dois sintomas do mesmo mecanismo:
   worktrees/branches órfãs acumuladas apesar do texto mandar limpar, e nada barrando
   regressão planejada. Não é lido pelo modelo — só a saída entra em contexto.
2. **Learnings ganham ciclo de vida** (defeito 1). Cap passa a ser **por bytes (6 KB)**
   e não por contagem: limite por quantidade fazia a regra crescer por dentro
   ("estendido em <data>") em vez de alguém deletar. `/ps:publish` ganha triagem de
   entrada (só fato não-derivável entra; coberto por ferramenta → config; falta código
   → task; passo de processo → descartado, nunca funcionou) e um passo de **promoção**:
   toda regra tenta sair do arquivo virando código/config/task. Estado terminal =
   deletada; o git log é o arquivo morto. Fonte de destilação passa a incluir as
   threads de review da PR.
3. **Story/task viram contrato** (defeito 2). `/ps:story` não "assa achados" mais:
   grava o *endereço* do achado (caminho do exemplar, símbolo a reusar, comando a
   rodar). Proibido código de implementação literal, número medido à mão e norma que
   já vive em CLAUDE.md/ARCHITECTURE.md. Teto: story ≤ 40 linhas, task ≤ 60,
   conferido com `wc -l` — estouro é erro de decomposição, volta pro passo 4.
   Template de task reescrito: Outcome / Independently shippable / Scope / When to run
   / Verify / Forbidden.
4. **"Independentemente shippable" vira critério de decomposição** (defeito 3), no
   mesmo nível de "revisável sozinha". Janela de degradação só existe com aval
   explícito do dono e vira **campo** (`window: NN-slug — o que degrada`), não frase
   solta; `/ps:publish` barra o merge enquanto a task que fecha não tiver PR, e
   `/ps:load` reporta risco além de ordem.
5. **`/ps:review` posta por default** (defeito 4b). Antes, "poste só se pedirem"
   produziu zero review registrado numa série longa de PRs — os achados viraram
   commits genéricos e o histórico do processo não existia. Agora postar é o padrão
   (uma chamada, CLI descoberto), o re-review também posta, e o commit de correção
   nomeia o achado. É esse histórico que alimenta o passo 2.

Contabilidade de contexto: comandos 329 → 328 linhas (tudo que virou script saiu da
prosa). Templates 35 → 51 — mas o task file *preenchido* cai de 300–400 linhas para
≤ 60, que era o custo real.

## v0.5.0 (2026-07-27) — `/ps:pipe`

Sétimo comando, pedido explícito do dono: encadeia load → run → review → publish sem
supervisão. Decisões:

1. **Regente, não cópia.** Cada passo do pipe É o comando existente (`/ps:load`,
   `/ps:run`, `/ps:review`, `/ps:publish`) — invocado ou lido de
   `.claude/commands/ps/*.md` e seguido literalmente. Nenhuma regra dos quatro é
   repetida no pipe; se um gate mudar, o pipe não precisa ser editado. Foi o que
   permitiu caber em ~55 linhas.
2. **Autorização explícita e delimitada.** O pipe pode agir sem perguntar entre
   passos, paralelizar e iterar review → fix. Não pode pular gate, enfraquecer check
   nem decidir escopo — nesses casos ele **parqueia** a task (uma linha no relatório)
   e segue com o resto, em vez de travar a fila.
3. **Paralelo onde é seguro, série onde não é.** Tasks de uma mesma onda rodam em
   subagentes `general-purpose` paralelos (cap 4), cada um em sua worktree/PR — o task
   file virou contrato auto-contido na v0.4, que é justamente o que torna o subagente
   frio viável aqui. Reviews paralelizam de graça (já são subagentes). **Publish é
   estritamente serial**: ele rebaseia a branch base e varre worktrees; dois ao mesmo
   tempo se corrompem.
4. **Loop de review com teto.** blocker/major → corrige e re-review; minor → só se for
   one-liner; 3ª rodada sem APPROVED → para aquela PR e devolve ao dono. Nunca mergeia
   PR não aprovada.
5. **Relatório de uma linha por transição** (`▸ wave 1/2 …`, `✓ 03 → PR #41`), sem
   prosa entre elas — o dono acompanha sem dirigir.
6. Dois riscos do paralelismo tratados no texto: PRs irmãs marcam checkboxes
   diferentes no mesmo `story.md` (conflito de squash-merge → manter os dois), e a
   task que abre `window:` publica imediatamente antes da que fecha.

## v1.0.0 (2026-07-28) — O ciclo deixa de custar duas horas

Sintoma medido pelo dono: **uma task levava perto de 2 horas**, das quais só 10–30 min
eram escrever código. A auditoria achou 15 gargalos; nenhum era "o modelo é lento".
Eles se agrupam em três causas e a v1.0 ataca as três.

**Causa A — o mesmo trabalho feito N vezes.**

1. **A suíte rodava 4x** (executor, reviewer, fix round, verificação). A v0.1 já tinha
   corrigido isso para 2x (decisão 4 abaixo) e a v0.4 perdeu a regra. Agora: executor
   roda uma vez no fim, reviewer roda uma vez do frio, e **é só**. O fix round roda os
   checks que os findings nomeiam; a verificação re-roda só esses. Nenhum dos dois roda
   a suíte inteira.
2. **Worktree fria pagava um install completo por task** — e nenhum comando mencionava
   isso, o que é por que passou despercebido por 4 versões. Novo modo
   `ps-check.sh warm <path>`: linka `node_modules`/`.venv`/`vendor`/... do checkout
   principal para a worktree recém-criada. Os lockfiles são idênticos por construção
   (a worktree acabou de ser cortada dali), então compartilhar é seguro. Guard impresso
   na saída: task que mexe em lockfile quebra o link e instala de verdade.
3. **A investigação do plan-time era jogada fora e refeita 3x.** A v0.4 mandou o task
   file gravar só o *endereço* do achado — o que obrigava executor e reviewer a reabrir
   o repo. Volta a decisão 16 da v0.1: `## Context` obrigatório no task file, com as
   linhas do exemplar citadas, a assinatura do símbolo verbatim e os comandos
   confirmados. Teto do task sobe de 60 para **120 linhas**, deliberadamente: 60 linhas
   lidas uma vez custam menos que dois agentes re-derivando-as do repositório.
10. **Learnings destilados por PR** viravam uma mini-análise de 5–10 min a cada merge.
    Agora rodam **uma vez por story**, no publish que zera o `remaining` — número que o
    `ps-check.sh sync` devolve de graça.
11. **Round 1 era um subagente serial com 6 lentes.** Vira **dois em paralelo**: `run`
    executa (DoD, correção, segurança), `read` compara com o exemplar (ausências,
    duplicação, scope creep, over-engineering) e **não roda nada**. Terreno disjunto,
    ninguém espera ninguém, e a suíte roda exatamente uma vez na rodada.
12. **Mutation testing obrigatório na verificação** virava editar/rodar/reverter por
    finding. Fica só onde é informativo: um finding de "teste passa vazio".

**Causa B — trabalho mecânico feito por prosa, ou feito com rede.**

4. **`ps-check.sh` fazia uma chamada de rede por branch** (duas quando havia ref
   remota), sem cache, em toda invocação — e `/ps:pipe` re-roda `/ps:load` por onda.
   Medido: 0,61s por chamada. Agora é **uma chamada só**, para dentro de `$PRS`, e todo
   lookup depois é `awk` local. O `git for-each-ref` que rodava dentro do loop de tasks
   saiu para fora, e o loop de janelas virou um `grep -l` único.
13. **O checkbox em `story.md` era marcado dentro da PR da própria task**, o que fazia
    toda PR irmã conflitar naquele arquivo. Agora o estado da task é **derivado do
    estado da PR** (`ps-check.sh status <slug>`), e `sync` marca os boxes na branch base
    depois do merge. Idempotente, sem conflito, e o checkbox continua valendo como
    fallback quando não há `gh`/`glab` na máquina.
15. **`review.md` tinha 132 linhas e o prompt do subagente era um blockquote de ~60**
    que o chat principal regerava como *output* a cada dispatch, duas vezes por PR. Os
    prompts saíram para `.claude/ps-review.md` e `.claude/ps-verify.md`, que os
    subagentes leem sozinhos. O dispatch virou uma frase; `review.md` caiu para ~80
    linhas sem perder nenhuma regra.

**Causa C — o loop parava esperando gente.**

7. **Nenhum `allowed-tools`**: cada `git`, `gh`, `npm test` podia pedir aprovação.
   Todo comando agora declara o seu. É o escopo certo — por comando, dentro do pacote,
   sem tocar em `settings.json` do usuário.
8. **Seis pontos de bloqueio explícitos.** Viram *park*: reporta uma linha, larga
   aquela task, segue com o resto. Sobrou um bloqueio de verdade, e é o certo: janela
   de degradação aberta no `/ps:publish`, porque mergear ali embarca uma regressão.
   O review passa a rotear por severidade sozinho em vez de "triar junto com o dono".
5. **Hook do impeccable apontando para arquivo inexistente** (`${CLAUDE_PROJECT_DIR}`
   em vez do global), spawnando `node` a cada Edit/Write. Repontado — a skill existe em
   `~/.claude/skills/`, o caminho é que estava errado.

**Causa D — o que não é do pacote.**

6. `effortLevel: high` + Opus são multiplicadores em cima de ~100 turnos e vivem no
   `~/.claude/settings.json` do dono. Documentados no README, não alterados: preferência
   de quem usa, não decisão de pacote.
9. **Granularidade 1 task = 1 PR fica.** O custo dela era o overhead fixo, e o overhead
   foi embora — resolver por composição em vez de inventar um modo de bundle. O lever
   real foi para onde pertence: `/ps:story` ganhou um terceiro critério de decomposição
   ("worth a PR"), então uma fatia de poucas linhas é dobrada na vizinha **no plan
   time**, e `/ps:run` continua se recusando a agrupar.
14. **Publish continua estritamente serial** (rebase + sweep se corrompem em paralelo),
    mas agora é barato: merge + `sync` + `sweep` de uma chamada, e a passada de
    learnings dispara só no último. Resolvido por composição, sem máquina nova.

Nada disso adicionou dependência (o pacote segue zero-dep) nem arquivo executável novo
— `ps-check.sh` continua sendo o único, com quatro modos em vez de dois. O smoke test
ganhou cobertura para `status`, `sync` e `warm`, incluindo a asserção de que remover
uma worktree aquecida **não** segue o link e apaga as dependências compartilhadas.

> Tudo abaixo desta linha descreve a v0.1 — mantido como registro histórico.
> As decisões 1–16 e a estrutura listada NÃO refletem mais o estado atual.

---

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
