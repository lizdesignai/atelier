# Manual do Sistema de Gestão Financeira v2 — Atelier

Bem-vindo à documentação oficial do novo Sistema de Gestão Financeira do Atelier.
Este módulo foi totalmente reconstruído para atender às necessidades operacionais e estratégicas da **Contadora**, dos **Gestores** e dos **Sócios/Admin** da agência.

---

## 1. Arquitetura e Princípios Contábeis

1. **Fonte Única da Verdade**:
   - Todas as transações financeiras são registradas na tabela `fin_entries`.
   - Baixas e pagamentos efetivos são gravados na tabela `fin_settlements`.
   - Relatórios como DRE, Fluxo de Caixa, Balanço Patrimonial e Valuation são derivados diretamente do razão contábil.
2. **Duplo Regime (Competência vs Caixa)**:
   - **Regime de Competência (Fato Gerador)**: apurado por `competence_date`, demonstrando o faturamento real dos serviços prestados e custos incorridos no mês.
   - **Regime de Caixa (Liquidação Financeira)**: apurado por `paid_date`, demonstrando as entradas e saídas reais que movimentaram as contas bancárias.
3. **Trilha de Auditoria Imutável (`fin_audit_log`)**:
   - Qualquer alteração de valor (`amount`), vencimento (`due_date`), pagamento (`paid_date`) ou status exige obrigatoriamente uma **justificativa contábil** formal (mínimo de 5 caracteres).
   - O histórico de alterações registra quem alterou, quando, estado anterior, novo estado e motivo.
4. **Trava de Fechamento Mensal (`fin_periods`)**:
   - Ao final do mês, a contadora ou gestor executa o fechamento da competência.
   - O período passa para o status `closed` e congela um snapshot oficial da DRE e saldos.
   - Qualquer tentativa de criar ou alterar lançamentos retroativos em período fechado é bloqueada pelo servidor (HTTP 409).
   - Apenas o perfil `admin` possui autorização para reabrir um período previamente fechado.

---

## 2. Dicionário do Modelo de Dados

| Tabela | Finalidade | Principais Campos |
|---|---|---|
| `fin_accounts` | Plano de contas contábil hierárquico | `code`, `name`, `type`, `category`, `statement_group` |
| `fin_bank_accounts` | Contas correntes, investimentos e gateways | `name`, `bank_name`, `account_type`, `current_balance`, `is_default` |
| `fin_suppliers` | Fornecedores, parceiros e prestadores de serviços | `name`, `document`, `pix_key`, `email`, `phone`, `default_account_id` |
| `fin_entries` | Razão contábil principal de receitas e despesas | `kind`, `source`, `title`, `amount`, `amount_paid`, `due_date`, `paid_date`, `competence_date`, `status`, `external_ref` |
| `fin_settlements` | Baixas e quitações financeiras | `entry_id`, `bank_account_id`, `payment_date`, `amount`, `fee_amount`, `net_amount`, `receipt_url` |
| `fin_invoices` | Notas Fiscais emitidas e recebidas (NFS-e / NF-e) | `invoice_number`, `invoice_type`, `issue_date`, `total_amount`, `tax_deductions`, `pdf_url`, `xml_url` |
| `fin_tax_obligations` | Calendário de tributos (Simples Nacional DAS, ISS) | `tax_type`, `competence`, `due_date`, `amount`, `status`, `guide_url`, `receipt_url` |
| `fin_periods` | Trava de competência e snapshots contábeis | `closing_month`, `status`, `closed_at`, `closed_by`, `dre_snapshot`, `cash_balance_snapshot` |
| `fin_audit_log` | Auditoria detalhada de conformidade contábil | `entity_type`, `entity_id`, `action`, `before_state`, `after_state`, `reason`, `user_id` |
| `fin_valuation_scenarios` | Histórico de simulações e cálculos de valuation | `name`, `scenario_type`, `ebitda_multiple`, `mrr_multiple`, `discount_rate`, `calculated_valuation` |

---

## 3. Matriz de Perfis e Permissões (RBAC)

| Funcionalidade / Capacidade | `contador` | `gestor` | `admin` | `colaborador` / `client` |
|---|:---:|:---:|:---:|:---:|
| Acesso ao Módulo Financeiro (`/admin/financeiro/**`) | ✅ | ✅ | ✅ | ❌ |
| Visualizar DRE, Balanço, Fluxo de Caixa e Relatórios | ✅ | ✅ | ✅ | ❌ |
| Criar e Editar Lançamentos (com justificativa de auditoria) | ✅ | ✅ | ✅ | ❌ |
| Baixar e Liquidar Títulos (Settlement) | ✅ | ✅ | ✅ | ❌ |
| Lançar Gastos e Serviços Avulsos | ✅ | ✅ | ✅ | ❌ |
| Gerenciar Notas Fiscais e Retenções | ✅ | ✅ | ✅ | ❌ |
| Gerenciar Tributos e Guias do Simples Nacional (DAS) | ✅ | ✅ | ✅ | ❌ |
| Executar Fechamento Contábil Mensal | ✅ | ✅ | ✅ | ❌ |
| Reabrir Período Contábil Fechado | ❌ | ❌ | ✅ | ❌ |
| Excluir Lançamentos Definitivamente | ❌ | ❌ | ✅ | ❌ |
| Alterar Premissas Globais de Valuation | ❌ | ✅ | ✅ | ❌ |

---

## 4. Runbook Operacional da Contadora

### 4.1 Lançamento de Despesas e Gastos Avulsos
1. Acesse o menu **Gastos & Avulsos** (`/admin/financeiro/avulsos`) ou clique em **Novo Lançamento** no topo de qualquer tela financeira.
2. Preencha o Título (ex: *"Licença Anual Figma Estúdio"*), selecione a conta de despesa (ex: *4.1.01 Softwares & Licenças*), informe o fornecedor, valor e vencimento.
3. Se o pagamento for parcelado, informe o número de parcelas (ex: 3x) — o sistema gerará automaticamente os lançamentos mensais com competências consecutivas.

### 4.2 Edição de Lançamentos (Alteração de Vencimento ou Valor)
1. Na listagem de **Lançamentos** (`/admin/financeiro/lancamentos`), localize o registro e clique no ícone de lápis.
2. Altere o valor ou a data de vencimento.
3. O modal exibirá um aviso em destaque informando que a alteração é crítica para a contabilidade.
4. Preencha obrigatoriamente a **Justificativa da Edição** (ex: *"Cliente solicitou prorrogação do vencimento devido a feriado bancário"*).
5. Ao salvar, a alteração é gravada no razão e uma entrada na auditoria contábil é criada.

### 4.3 Baixa de Recebimentos e Pagamentos (Liquidação)
1. Na tela **A Receber** (`/admin/financeiro/receber`) ou **A Pagar** (`/admin/financeiro/pagar`), clique no botão **Baixar** do título desejado.
2. Confirme ou ajuste a data efetiva do pagamento e o valor recebido/pago.
3. Caso haja taxas bancárias ou desconto de gateway, informe para apuração do valor líquido real.
4. Anexe o link do comprovante bancário (se houver) e confirme.
5. O título passará para o status `pago` e o saldo da conta bancária será atualizado.

### 4.4 Controle de Obrigações Fiscais (Guia DAS do Simples Nacional)
1. Acesse a aba **Impostos & DAS** (`/admin/financeiro/impostos`).
2. O DAS do Simples Nacional apura a receita bruta da competência anterior e tem vencimento no dia **20** de cada mês.
3. Clique em **Cadastrar Guia** para informar a competência apurada, data de vencimento, valor calculado e URL da guia em PDF.
4. Quando a guia for quitada, registre a baixa anexando o comprovante de pagamento bancário.

### 4.5 Fechamento Contábil Mensal
1. No início do mês (idealmente entre os dias 1 e 10), acesse **Fechamento Mensal** (`/admin/financeiro/fechamento`).
2. Selecione a competência a ser encerrada (ex: `2026-09`).
3. O painel apresentará o checklist contábil automático:
   - Total de receitas faturadas e recebidas.
   - Total de despesas pagas e a pagar.
   - Saldo final de caixa consolidado.
   - Existência de lançamentos pendentes ou sem categoria.
4. Preencha as notas contábeis e clique em **Travar e Fechar Competência**.
5. O sistema salvará o snapshot congelado da DRE e bloqueará edições retroativas.

---

## 5. Guia Estratégico do Gestor e CFO

### 5.1 Demonstrações Contábeis (DRE e Balanço)
- Acesse **DRE & Balanço** (`/admin/financeiro/relatorios`).
- Alterne entre **Regime de Competência** (apuração gerencial do faturamento) e **Regime de Caixa** (entradas e saídas reais de dinheiro).
- A DRE calcula com exatidão a **Receita Líquida**, **Lucro Bruto**, **EBITDA Operacional**, margens percentuais e o **Resultado Líquido do Exercício**.
- O Balanço Patrimonial gerencial valida a equação contábil: `Ativo Total = Passivo Total + Patrimônio Líquido`.
- É possível exportar relatórios em formato CSV para planilhas ou acionar a impressão direta em PDF.

### 5.2 Painel de Valuation
- Acesse a aba **Valuation** (`/admin/financeiro/valuation`).
- O motor calcula 3 metodologias combinadas:
  1. **Múltiplo de EBITDA**: padrão de mercado de agências de branding (3.5x a 6.5x).
  2. **Múltiplo de ARR (Receita Anual Recorrente)**: avaliação dos contratos fixos de retainer e Instagram (1.0x a 2.2x).
  3. **DCF (Fluxo de Caixa Descontado)**: projeção em 5 anos com perpetuidade de Gordon.
- A recomendação oficial é ponderada: `50% EBITDA + 30% ARR + 20% DCF`.
- Utilize o simulador interativo para projetar o valor da empresa alterando múltiplos e taxas em tempo real.

### 5.3 Inteligência de Crescimento ("Onde Crescer")
- Acesse a aba **Onde Crescer** (`/admin/financeiro/crescimento`).
- **Rentabilidade por Linha de Serviço**: visão comparativa de margem entre *Identidade Visual*, *Gestão de Instagram*, *O Mapa* e *Parcerias B2B*.
- **Matriz Estratégica**:
  - 🚀 *Acelerar & Escalar*: serviços de alta margem (>70%) — direcionar investimento em anúncios e vendas.
  - 🛡️ *Foco em Retenção*: serviços recorrentes de boa margem — priorizar atendimento e CS para evitar churn.
  - ⚙️ *Otimizar Eficiência*: alto volume com custo de produção elevado — reduzir refações e padronizar entregas.
  - 🏷️ *Reprecificar*: serviços com margem comprimida — reajustar tabela comercial.
- **Alocação de Caixa (CFO Engine)**:
  - *Modo Sobrevivência* (runway < 3 meses): 100% reserva de emergência, sem dividendos.
  - *Modo Conservador* (caixa de 2 a 4 meses): 60% reserva, 30% growth, 10% dividendos.
  - *Modo Expansão Acelerada* (caixa > 4 meses): 25% reserva, 45% growth/anúncios, 30% dividendos.

---

## 6. Automações e Integrações Ativas

1. **Webhook do Asaas (`/api/webhooks/asaas`)**:
   - Processa confirmações de pagamento (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`) com idempotência via `external_ref`.
   - Gera lançamentos e baixas automáticas discriminando taxas de gateway.
   - Ativa contratos sem corromper o valor contratual original.
2. **Cron Diário Financeiro (`/api/cron/finance`)**:
   - Provisiona faturamento recorrente de contratos ativos no início do mês.
   - Dispara alertas no sistema para contas a vencer em 3 dias, receitas em atraso, vencimento do DAS (dia 20) e fechamento mensal.
