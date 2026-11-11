import { describe, it, expect } from 'vitest';
import { isExcludedFromFocus, isFocusOperationalTask } from '../focusRules';

describe('focusRules — Triagem Operacional para o Focus', () => {
  describe('1. Relatório de Desempenho e Relatórios Analíticos', () => {
    it('exclui Relatório de Desempenho & Inteligência de ciclo', () => {
      const task = {
        title: 'Relatório de Desempenho & Inteligência • Ciclo #1',
        stage: 'Relatório',
        task_type: 'management',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui Geração de Relatório Mensal', () => {
      const task = {
        title: 'Geração de Relatório Mensal',
        stage: 'Relatório',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui tarefas com stage Relatório', () => {
      const task = {
        title: 'Consolidação de Métricas Mensais',
        stage: 'Relatório',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
    });

    it('preserva post/peça de design cujo tema menciona relatório', () => {
      const task = {
        title: 'Carrossel: Como analisar o Relatório de Segurança da sua Empresa',
        stage: 'Produção',
        task_type: 'design',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });
  });

  describe('2. Aprovação de Conteúdos', () => {
    it('exclui Aprovação de Conteúdos & Agendamento de ciclo', () => {
      const task = {
        title: 'Aprovação de Conteúdos & Agendamento • Ciclo #2',
        stage: 'Aprovação',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui Aprovação do Cliente & Agendamento', () => {
      const task = {
        title: 'Aprovação do Cliente & Agendamento',
        stage: 'Aprovação',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui Enviar Planejamento para Aprovação', () => {
      const task = {
        title: 'Enviar Planejamento para Aprovação',
        stage: 'Estratégia',
        task_type: 'planning',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('preserva peça criativa com título contendo aprovado', () => {
      const task = {
        title: 'Design: ANVISA aprova novo medicamento (Carrossel)',
        stage: 'Demanda Pontual',
        task_type: 'design',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });
  });

  describe('3. Agendamentos', () => {
    it('exclui Agendamento Sistêmico', () => {
      const task = {
        title: 'Agendamento Sistêmico',
        stage: 'Aprovação',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui tarefas com task_type Agendamento', () => {
      const task = {
        title: 'Reunião de Alinhamento Aissa',
        stage: 'Demanda Pontual',
        task_type: 'Agendamento',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });

    it('exclui tarefas com stage Agendamento', () => {
      const task = {
        title: 'Programação de posts na plataforma',
        stage: 'Agendamento',
        task_type: 'setup',
      };
      expect(isExcludedFromFocus(task)).toBe(true);
      expect(isFocusOperationalTask(task)).toBe(false);
    });
  });

  describe('4. Tarefas Operacionais (Devem subir pro Focus)', () => {
    it('inclui Posts gráficos normais', () => {
      const task = {
        title: 'Post 1 • Ciclo #1',
        stage: 'Produção',
        task_type: 'design',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });

    it('inclui Edição de Reels/Vídeos', () => {
      const task = {
        title: 'Reels 1 • Ciclo #1',
        stage: 'Produção',
        task_type: 'video',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });

    it('inclui Planejamento Editorial & Estratégia', () => {
      const task = {
        title: 'Planejamento Editorial & Estratégia • Ciclo #1',
        stage: 'Estratégia',
        task_type: 'copy',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });

    it('inclui Demandas pontuais de design', () => {
      const task = {
        title: 'Card institucional dia dos pais',
        stage: 'Demanda Pontual',
        task_type: 'design',
      };
      expect(isExcludedFromFocus(task)).toBe(false);
      expect(isFocusOperationalTask(task)).toBe(true);
    });
  });
});
