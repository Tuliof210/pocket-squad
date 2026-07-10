# HANDOFF — Pocket Squad

> Contexto para continuar o desenvolvimento no Claude Code, com o projeto aberto.
> Origem: conversa de concepção e geração da v0.1.0 (2026-07-10).

## O que é o projeto

**Pocket Squad**: pacote npx que instala uma squad de desenvolvimento completa para
Claude Code em qualquer projeto. Ao rodar `npx pocket-squad`, o projeto recebe
`.claude/` (agents + commands) e `.squad/` (workflow de Histórias/Tarefas em MD).

O dono do projeto (humano) pede algo via `/story`; o TechLead refina, gera História e
Tarefas em markdown editáveis; o dono revisa/edita, dá `/approve` e `/run`; agentes
especialistas executam com gates de QA/review sem viés.

## Decisões de design já tomadas (não rediscutir sem motivo)

1. **Tiers em vez de escolha dinâmica de modelo.** Subagentes têm modelo fixo no
   frontmatter, então cada especialidade tem 3 agentes: junior (haiku), pleno
   (sonnet), senior (opus). O TechLead roteia por rubrica escrita e grava a
   justificativa na Tarefa (auditável).
2. **Junior não improvisa.** Se falta decisão no task file → `status: blocked` e
   devolve ao techlead. Escalar é sucesso no tier dele.
3. **Escalação automática:** 2 reprovações no mesmo tier → techlead reatribui ao tier
   acima (nunca 3ª tentativa no mesmo tier).
4. **DoD verificado por terceiro:** QA/reviewer (pleno/senior) executam os checks eles
   mesmos; implementador nunca se auto-aprova. DoD preferencialmente executável
   (testes/lint/build passam).
5. **Sem "modo rápido" que fure o histórico** (decisão explícita do dono). Alternativa
   permitida: TechLead pode gerar "História mínima" (1 tarefa, 1 pergunta) para
   trivialidades — registro sempre mantido.
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
12. Custo visível antes de executar: `/approve` mostra custo relativo estimado
    (soma complexidade × tier) e exige confirmação explícita.

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
    │   └── commands/
    │       ├── story.md  approve.md  run.md  status.md
    └── squad/
        ├── project-context.md    # template de briefing 1 página
        ├── learnings.md          # formato rígido documentado
        └── stories/.gitkeep
```

**Testado:** ciclo install → customização de agente → update (arquivo intocado
atualizado in place; customizado preservado + `.new`) → status. Tudo passou.

**Manifest:** gravado em `.claude/pocket-squad.manifest.json` no projeto alvo.

## Fluxo instalado no projeto alvo

`/story "pedido"` → techlead refina → gera `.squad/stories/<data>-<slug>/{story.md,
tasks/NN-*.md, board.md}` (status: draft) → dono edita (edições são lei) →
`/approve` (valida depends_on, contratos, mostra custo) → `/run` (ondas paralelas,
gates, escalação, board atualizado, learnings ao final) → `/status` a qualquer momento.

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
5. **Possíveis melhorias no /run:** worktrees git isoladas por História (padrão do
   squad-run do usuário) para evitar conflito entre tarefas paralelas tocando os
   mesmos arquivos.
6. **"História mínima"** formalizada no prompt do techlead (hoje só mencionada).

## Riscos conhecidos

- Squad completa por tarefa é cara — techlead deve preferir o menor conjunto de
  agentes que satisfaz o DoD (já instruído, monitorar na prática).
- learnings.md pode degenerar em ruído — regra: entrada que não muda comportamento
  futuro é deletada.
- Skills baixadas rodam com acesso ao código — tratar como dependência.
